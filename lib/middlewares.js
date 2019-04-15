// eslint-disable-next-line no-unused-vars
import { ContextMessageUpdate as CtxT } from 'telegraf'

/** @param {CtxT} ctx */
export const report = ctx => {
  const repMessage = ctx.message.reply_to_message
  ctx.reply(
    `<code>${JSON.stringify(repMessage, null, 2)}</code>`,
    {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'HTML'
    }
  )
}

/** @param {CtxT} ctx */
export const newMember = ctx => {

}

/** @param {CtxT} ctx */
export const unban = ctx => {

}
