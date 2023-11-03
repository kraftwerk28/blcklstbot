import { Context } from "../types/index.js";
import type { Message, Chat } from "grammy/types";
import type { Middleware, MiddlewareFn } from "grammy";
import { log } from "../logger.js";

export const botHasSufficientPermissions: Middleware<Context> = async (
  ctx,
  next,
) => {
  // TODO: cache chat member with some EXPIRE in redis
  const me = await ctx.getChatMember(ctx.me.id);
  if (me.status !== "administrator" || !me.can_delete_messages) {
    log.warn(`Bot cannot delete messages in chat ${ctx.chat!.id}`);
    return;
  }
  // FIXME: doesn't work for some reasons
  // if (!me.can_send_messages) {
  //   return log.warn(`Bot cannot send messages in chat ${ctx.chat.id}`);
  // }
  return next();
};

// TODO: turn into a middleware
export const senderIsAdmin: MiddlewareFn<Context> = async (ctx, next) => {
  if (!ctx.from) return;
  if (ctx.from.id === ctx.botCreatorId) {
    // XD
    return next();
  }
  const cm = await ctx.getChatMember(ctx.from.id);
  if (cm.status === "administrator" || cm.status === "creator") {
    return next();
  }
};

type GroupChatContext<C> = C & {
  chat: Chat.SupergroupChat | Chat.GroupChat;
};

export const isGroupChat = <C extends Context>(
  ctx: C,
): ctx is GroupChatContext<C> => {
  if (!ctx.chat) return false;
  return ctx.chat.type === "group" || ctx.chat.type === "supergroup";
};

type ReplyContext<C> = C & {
  message: Message & {
    reply_to_message: Omit<Message, "reply_to_message">;
  };
};

export const messageIsReply = <C extends Context>(
  ctx: C,
): ctx is ReplyContext<C> => {
  return typeof ctx.message?.reply_to_message === "object";
};

/** Ensures that replies messages is not from admin or bot */
// export const repliedMessageIsFromMember = async function (ctx) {
//   const reply = ctx.message.reply_to_message;
//   if (typeof reply?.from?.id !== "number") return false;
//   if (reply.from.id === ctx.botInfo.id) {
//     return false;
//   }
//   const chatMember = await ctx.getChatMember(reply.from.id);
//   return chatMember.status === "member";
// } as GuardPredicate<MatchedContext<Ctx, "text">>;
