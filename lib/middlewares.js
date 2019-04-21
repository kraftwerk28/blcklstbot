// eslint-disable-next-line no-unused-vars
import { ContextMessageUpdate as CtxT, Telegram } from 'telegraf'
import { replicas as REPLICAS } from './cfgLoader'
import * as api from './api'
import * as db from './db'

const {
  ADMIN_UID
} = process.env

/**
 * @param {Telegram} telegram
 * @param {Chat} chat
 * */
const iAmAdmin = async (telegram, chat) => {
  const { id: meId } = await telegram.getMe()
  const { can_restrict_members, can_delete_messages } =
    await telegram.getChatMember(chat.id, meId)
  return can_restrict_members && can_delete_messages
}

/**
 * 
 * @param {CtxT} ctx 
 * @param {string} text 
 * @param {import('telegraf/typings/telegram-types').ExtraReplyMessage} extra 
 */
const sendGroupMsg = async (ctx, text, extra) => {
  const group = await db.getGroup(ctx.chat.id)
  const silent = group && group.silent
  !silent && ctx.reply(text, extra)
}

/** @param {CtxT} ctx */
export const report = async ({ message, telegram, chat, from, reply }) => {
  const admins = await telegram.getChatAdministrators(chat.id)
  const reportedMsg = message.reply_to_message

  // check if command is replying
  if (reportedMsg) {
    // check if admin have reported or no
    if (admins.findIndex(({ user: { id } }) => id === from.id) > -1) {
      // check if bot can ban
      if (await iAmAdmin(telegram, chat)) {
        const { id, first_name, last_name, username } = reportedMsg.from
        api.addUser({
          id, first_name, last_name, username,
          reason: 'wow, such spammer',
          message: reportedMsg.text
        })
        telegram.deleteMessage(chat.id, reportedMsg.message_id)
        telegram.kickChatMember(chat.id, id)

      } else {
        reply(REPLICAS.i_am_not_admin, {
          reply_to_message_id: message.message_id
        })
      }
    } else {
      reply(REPLICAS.you_are_not_admin, {
        reply_to_message_id: message.message_id
      })
    }
  }
}

/** @param {CtxT} ctx */
export const newMember = async ctx => {
  const me = await ctx.telegram.getMe()

  // if someone added ME
  if (ctx.message.new_chat_members.findIndex(({ id }) => id === me.id) !== -1) {
    await ctx.reply(REPLICAS.group_welcome)
    const newGroupMsg = '<b>New group</b>\n\n' +
      `chat id: <code>${ctx.chat.id}</code>\n\n` +
      `<code>${JSON.stringify(ctx.message, null, 2)}</code>`
    await ctx.telegram.sendMessage(ADMIN_UID, newGroupMsg, {
      parse_mode: 'HTML'
    })
  }

  // if someone joined
  const newMembers = ctx.message.new_chat_members
  /** @type {Array<number>} */
  const blackList = (await api.getBlacklist()).map(({ id }) => id)
  const toBeBanned = newMembers
    .filter(({ id }) => blackList.some(_id => _id === id))
  toBeBanned.forEach(({ id: uId, username, first_name }) => {
    ctx.telegram.kickChatMember(ctx.chat.id, uId)
    ctx.reply(REPLICAS.user_banned.replace(
      /\$1/, username ? `@${username}` : first_name
    ))
  })
}

/** @param {CtxT} ctx */
export const leftMember = async ({
  message, from, telegram: { getMe, deleteMessage }
}) => {
  // (from.id === (await getMe()).id) &&
  //   deleteMessage(message.chat.id, message.message_id)
}

/** @param {CtxT} ctx */
export const unban = ctx => {
  // going to be implemented later...
}

/** @param {CtxT} ctx */
export const help = ({ reply, message: { message_id } }) => {
  reply(REPLICAS.rules, {
    reply_to_message_id: message_id
  })
}

/** @param {CtxT} ctx */
export const debugInfo = ({ message, reply }) =>
  reply(`<code>${JSON.stringify(message, null, 2)}</code>`, {
    parse_mode: 'HTML', reply_to_message_id: message.message_id
  })

/** @param {CtxT} ctx */
export const getByUsernameReply = async ({
  message, chat, telegram, reply
}) => {
  const uId = message.reply_to_message.from.id
  const user = await telegram.getChatMember(chat.id, uId)
  reply(`<code>${JSON.stringify(user.user, null, 2)}</code>`, {
    parse_mode: 'html'
  })
}
