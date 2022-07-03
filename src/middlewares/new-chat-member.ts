import { Message, User } from 'typegram';

import { Composer } from '../composer';
import { getNewMembersFromUpdate, safePromiseAll } from '../utils';
import { Ctx, OnMiddleware } from '../types';
import { generateCaptcha, getCaptchaMessage } from '../captcha';
import { captchaHash } from '../utils/event-queue';
import { botHasSufficientPermissions } from '../guards';
import { CAPTCHA_MESSAGE_UPDATE_INTERVAL } from '../constants';

type Middleware = OnMiddleware<'new_chat_members' | 'chat_member'>;

/** Creates capthca.  Also registers user in DB for messages tracking */
export const onNewChatMember: Middleware = Composer.optional(
  Composer.allOf(
    async function (ctx) {
      // /me also wants to pass captcha so ima about to comment dis :)
      // if (ctx.from?.id === ctx.botCreatorId) return false;
      const cm = await ctx.getChatMember(ctx.from!.id);
      return cm.status === 'member';
    },
    // Composer.not(senderIsAdmin),
    botHasSufficientPermissions,
  ),
  async function (ctx, next) {
    if (ctx.dbChat.delete_joins) {
      await ctx.deleteMessage();
    }
    if (!ctx.dbChat.captcha_modes.length) {
      return next();
    }
    const newMembers = getNewMembersFromUpdate(ctx.update);
    if (!newMembers) return next();
    await safePromiseAll(newMembers.map(cm => userCaptcha(ctx, cm)));
    return next();
  } as Middleware,
);

async function userCaptcha(ctx: Ctx, user: User, isDemo = false) {
  const captchaTimeout = ctx.dbChat.captcha_timeout;
  const captchaDeadline = Math.floor(Date.now() / 1000) + captchaTimeout;
  const chatId = ctx.chat!.id;
  const userId = user.id;
  const captcha = generateCaptcha(ctx.dbChat.captcha_modes, captchaDeadline);

  ctx.dbStore.addPendingCaptcha(chatId, userId, captcha, captchaDeadline);
  const { text, keyboard } = getCaptchaMessage(
    ctx.t.bind(ctx),
    captcha,
    user,
    captchaTimeout,
  );
  const captchaMessage = await ctx.replyWithHTML(text, {
    reply_markup: keyboard,
  });

  await ctx.eventQueue.pushDelayed(
    CAPTCHA_MESSAGE_UPDATE_INTERVAL,
    'update_captcha',
    {
      chatId,
      userId,
      messageId: captchaMessage.message_id,
      chatLocale: ctx.dbChat.language_code,
    },
  );
  await ctx.eventQueue.pushDelayed(
    captchaTimeout,
    'captcha_timeout',
    {
      chatId: ctx.chat!.id,
      userId: user.id,
      captchaMessageId: captchaMessage.message_id,
      newChatMemberMessageId: ctx.message!.message_id,
    },
    captchaHash(ctx.chat!.id, user.id),
  );
}
