import { Composer } from '../composer';
import { botHasSufficientPermissions, isGroupChat } from '../guards';
import { log } from '../logger';
import { OnMiddleware } from '../types';
import { checkCASban, html } from '../utils';

export const checkCasBan = Composer.optional(
  Composer.allOf(isGroupChat, botHasSufficientPermissions),
  async function (ctx, next) {
    if (!ctx.dbChat.enable_cas) {
      return next();
    }
    const userId = ctx.from.id;
    const casLink = await checkCASban(userId);
    if (!casLink) {
      log.info(`User ${html.userFullName(ctx.from)} is not CAS banned`);
      return next();
    }
    log.info(
      `User ${html.userFullName(ctx.from)} (%d) received CAS ban`,
      userId,
    );
    await ctx.kickChatMember(userId);
    await ctx.replyWithHTML(
      ctx.t('cas_report', {
        user: html.userMention(ctx.from),
        cas_link: html.link(casLink, 'CAS'),
      }),
    );
    return next();
  } as OnMiddleware<'message'>,
);
