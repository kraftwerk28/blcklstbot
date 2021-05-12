import { Message, User } from 'typegram';

import { Composer } from '../composer';
import { safePromiseAll } from '../utils';
import { Ctx, OnMiddleware, CaptchaMode } from '../types';
import { generateCaptcha } from '../captcha';
// import { Captcha } from '../utils/captcha';
import { code, userMention } from '../utils/html';
import { captchaHash } from '../utils/event-queue';
import { botHasSufficientPermissions } from '../guards';

type Middleware = OnMiddleware<'new_chat_members' | 'chat_member'>;

/**
 * Creates capthca.
 * Also registers user in DB for messages tracking
 */
export const onNewChatMember: Middleware = Composer.guardAll(
  [
    async function (ctx) {
      // `/me` also wants to pass captcha so ima about to comment dis :)
      // if (ctx.from?.id === ctx.botCreatorId) return false;
      const cm = await ctx.getChatMember(ctx.from!.id);
      return cm.status === 'member';
    },
    botHasSufficientPermissions,
  ],
  async function (ctx, next) {
    if (ctx.dbChat.delete_joins) {
      await ctx.deleteMessage();
    }
    if (!ctx.dbChat.captcha_modes.length) {
      return next();
    }
    if (ctx.message?.new_chat_members?.length) {
      const promises = ctx.message.new_chat_members.map((cm) =>
        userCaptcha(ctx, cm),
      );
      safePromiseAll(promises);
      return;
    } else if (ctx.chatMember) {
      // TODO
      return;
    }
    return next();
  } as Middleware,
);

async function userCaptcha(ctx: Ctx, user: User) {
  const captcha = generateCaptcha(ctx.dbChat.captcha_modes);
  const captchaTimeout = ctx.dbChat.captcha_timeout;
  ctx.dbStore.addPendingCaptcha(ctx.chat!.id, user.id, captcha, captchaTimeout);
  let captchaMessage: Message;

  switch (captcha.mode) {
    case CaptchaMode.Arithmetic: {
      captchaMessage = await ctx.replyWithHTML(
        userMention(user) +
          ', please solve the following math expression:\n' +
          code(captcha.meta.expression) +
          `\nyou have ${ctx.dbChat.captcha_timeout} seconds.`,
      );
      break;
    }
    case CaptchaMode.Matrix: {
      const matrixText = captcha.meta.matrix
        .map((row) => '| ' + row.join(' ') + ' |')
        .join('\n');
      captchaMessage = await ctx.replyWithHTML(
        userMention(user) +
          ', please find the determinant of matrix below (a×d-b×c):\n' +
          code(matrixText) +
          `\nyou have ${ctx.dbChat.captcha_timeout} seconds.`,
      );
      break;
    }
  }

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
