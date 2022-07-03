import { HearsMiddleware } from '../types';
import { MIN_CAPTCHA_TIMEOUT, MAX_CAPTCHA_TIMEOUT } from '../constants';
import { Composer } from '../composer';
import { isGroupChat, senderIsAdmin } from '../guards';
import { deleteMessage } from '../middlewares';

export const captchaTimeout: HearsMiddleware = Composer.branch(
  Composer.allOf(senderIsAdmin, isGroupChat),
  async function (ctx) {
    const seconds = parseInt(ctx.match[1]);
    const replyOptions = { reply_to_message_id: ctx.message.message_id };
    if (seconds < MIN_CAPTCHA_TIMEOUT) {
      await ctx
        .reply(
          `Timeout must be at least ${MIN_CAPTCHA_TIMEOUT}s.`,
          replyOptions,
        )
        .then(ctx.deleteItSoon());
      return;
    }
    if (seconds > MAX_CAPTCHA_TIMEOUT) {
      await ctx
        .reply(`Timeout can be at most ${MAX_CAPTCHA_TIMEOUT}s.`, replyOptions)
        .then(ctx.deleteItSoon());
      return;
    }
    await Promise.allSettled([
      ctx.dbStore.updateChatProp(ctx.chat.id, 'captcha_timeout', seconds),
      ctx.deleteMessage(),
    ]);
  } as HearsMiddleware,
  deleteMessage,
);
