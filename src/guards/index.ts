import { Context } from "../types/index.js";
import type { Message, Chat } from "grammy/types";
import type { Middleware, MiddlewareFn } from "grammy";

export const botHasSufficientPermissions = async <C extends Context>(
  ctx: C,
) => {
  // TODO: cache chat member with some EXPIRE in redis
  const me = await ctx.getChatMember(ctx.me.id);
  if (me.status !== "administrator" || !me.can_delete_messages) {
    return false;
  }
  // FIXME: doesn't work for some reasons
  // if (!me.can_send_messages) {
  //   return log.warn(`Bot cannot send messages in chat ${ctx.chat.id}`);
  // }
  return true;
};

// TODO: turn into a middleware
export const senderIsAdmin = async <C extends Context>(ctx: C) => {
  if (!ctx.from) return false;
  if (ctx.from.id === ctx.botCreatorId) {
    // XD
    return true;
  }
  const cm = await ctx.getChatMember(ctx.from.id);
  return cm.status === "administrator";
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
