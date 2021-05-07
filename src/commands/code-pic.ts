import fetch from 'node-fetch';
import { URL } from 'url';
import { HearsMiddleware } from '../types';
import { getCodeFromMessage } from '../utils';

export const codePic: HearsMiddleware = async function(ctx, next) {
  const reply = ctx.message.reply_to_message;
  if (!reply || !('text' in reply)) return next();
  const languageName = ctx.match[1];
  const hlServerUrl = new URL(process.env.TREE_SITTER_SERVER_HOST!);
  // TODO: detect source language
  hlServerUrl.searchParams.append('lang', languageName);
  const code = getCodeFromMessage(reply);
  if (!code) return next();
  const response = await fetch(hlServerUrl, { method: 'POST', body: code });
  if (response.status === 200) {
    return ctx.replyWithPhoto(
      { source: response.body, filename: 'pic.png' },
      { reply_to_message_id: reply.message_id },
    );
  }
};
