// eslint-disable-next-line no-unused-vars
import { ContextMessageUpdate as CtxT } from 'telegraf'
import loadCfg from './cfgLoader'
import * as api from './api'
const { replicas: REPLICAS } = loadCfg()

const {
  ADMIN_UID
} = process.env

/** @param {CtxT} ctx */
const iAmAdmin = async ctx => {
  const { id: meId } = await ctx.telegram.getMe()
  const { can_restrict_members } =
    await ctx.telegram.getChatMember(ctx.chat.id, meId)
  return can_restrict_members
}

/** @param {CtxT} ctx */
export const report = async ctx => {
  const admins = await ctx.telegram.getChatAdministrators(ctx.chat.id)
  const reportedMsg = ctx.message.reply_to_message

  // check if command is replying
  if (reportedMsg) {
    // check if admin have reported or no
    if (admins.findIndex(({ user: { id } }) => id === ctx.from.id) > -1) {
      // check if bot can ban
      if (await iAmAdmin(ctx)) {
        const { id, first_name, last_name, username } = reportedMsg.from
        api.addUser({
          id, first_name, last_name, username,
          reason: 'wow, such spammer',
          message: reportedMsg.text
        })
      } else {
        ctx.reply(REPLICAS.i_am_not_admin, {
          reply_to_message_id: ctx.message.message_id
        })
      }
    } else {
      ctx.reply(REPLICAS.you_are_not_admin, {
        reply_to_message_id: ctx.message.message_id
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

  const newMembers = ctx.message.new_chat_members
  /** @type {Array<number>} */
  const blackList = (await api.getBlacklist()).map(({ id }) => id)
  const toBeBanned = newMembers
    .filter(({ id }) => blackList.some(_id => _id === id))
  toBeBanned.forEach(({ id }) => {
    console.log(id + ' banned...')
    // ctx.telegram.kickChatMember(ctx.chat.id, id)
  })
}

/** @param {CtxT} ctx */
export const unban = ctx => {
  // going to be implemented later...
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
