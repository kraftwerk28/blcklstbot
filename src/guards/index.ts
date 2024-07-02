import { Filter } from "grammy";
import { Context } from "../types/index.js";
import type { Message, Chat } from "grammy/types";

export const botHasSufficientPermissions = async <C extends Context>(
  ctx: C,
) => {
  // TODO: cache chat member with some EXPIRE in redis
  const me = await ctx.getChatMemberCached(ctx.me.id);
  if (me.status !== "administrator" || !me.can_delete_messages) {
    ctx.log.debug("Bot doesn't have sufficient permissions");
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
  const { from } = ctx;
  if (from) {
    if (from.id === ctx.botCreatorId) {
      return true;
    }
    const cm = await ctx.getChatMemberCached(from.id);
    if (cm.status === "administrator" || cm.status === "creator") {
      return true;
    }
    ctx.log.debug(`A privileged command was run by ${cm.status} user`);
  }
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery(ctx.t("admin_only_action"));
  }
  return false;
};

export const chatMemberJoined = <C extends Filter<Context, "chat_member">>(
  ctx: C,
) => {
  const { old_chat_member, new_chat_member } = ctx.chatMember;
  const oldStatus = old_chat_member.status;
  const newStatus = new_chat_member.status;
  return (
    oldStatus === "left" &&
    (newStatus === "member" || newStatus === "administrator")
  );
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
