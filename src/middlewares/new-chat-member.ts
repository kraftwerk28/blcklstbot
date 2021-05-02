import { Message, User } from 'typegram';

import { runDangling } from '../utils';
import { Ctx, OnMiddleware } from '../types';
import { Captcha } from '../utils/captcha';
import { code, userMention } from '../utils/html';
import { Composer } from 'telegraf';

type Middleware = OnMiddleware<'new_chat_members' | 'chat_member'>;

async function userCaptcha(ctx: Ctx, user: User) {
  const captcha = Captcha.generate();
  // TODO: put cahtcha to Redis store
  ctx.dbStore.addPendingCaptcha(ctx.chat!.id, user.id, captcha);
  let captchaMessage: Message;

  switch (captcha.mode) {
    case 'arithmetic': {
      captchaMessage = await ctx.replyWithHTML(
        userMention(user) +
        ', please solve the following math expression:\n' +
        code(captcha.meta.expression),
        { reply_to_message_id: ctx.message!.message_id },
      );
      break;
    }
    case 'matrix-denom': {
      const matrixText = captcha.meta.matrix
        .map(row => '| ' + row.join(' ') + ' |').join('\n')
      captchaMessage = await ctx.replyWithHTML(
        userMention(user) +
        ', please find the determinant of matrix below:\n' +
        code(matrixText)
      );
      break;
    }
  }

  ctx.eventQueue.pushDelayed(10, 'captcha_timeout', {
    chatId: ctx.chat!.id,
    userId: user.id,
    captchaMessageId: captchaMessage.message_id,
  });
}

export const onNewChatMember: Middleware = Composer.optional(
  async (ctx) => {
    if (ctx.from.id === ctx.botCreatorId) return false;
    const cm = await ctx.getChatMember(ctx.from.id);
    return cm.status === 'member';
  },
  async (ctx, next) => {
    if (ctx.message?.new_chat_members?.length) {
      const promises = ctx.message.new_chat_members.map(
        cm => userCaptcha(ctx, cm)
      );
      runDangling(promises);
      return;
    } else if (ctx.chatMember) {
      // TODO
      return;
    }
    return next();
  }
);
