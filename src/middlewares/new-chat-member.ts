import { runDangling } from '../utils';
import { Ctx, OnMiddleware } from '../types';
import { User } from 'typegram';
import { Captcha } from '../utils/captcha';

type Middleware = OnMiddleware<'new_chat_members' | 'chat_member'>;

async function userCaptcha(ctx: Ctx, user: User) {
  const captcha = new Captcha().generate();
  // TODO: put cahtcha to Redis store
  switch (captcha.type) {
    case 'arithmetic':
      await ctx.reply(
        `Please solve the following math example: ${captcha.expression}.`,
        { reply_to_message_id: ctx.message!.message_id },
      );
      break;
  }

  ctx.eventQueue.pushDelayed(10, 'captcha_timeout', {
    chatId: ctx.chat!.id,
    userId: user.id,
  });
}

export const onNewChatMember: Middleware = async function(ctx, next) {
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
