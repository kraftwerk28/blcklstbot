import { Composer } from '../composer';
import { OnMiddleware } from '../types';
import { isGroupChat } from '../guards';

export const addUserToDatabase: OnMiddleware<'message'> = Composer.optional(
  isGroupChat,
  async function (ctx, next) {
    const { id, first_name, last_name, username, language_code } = ctx.from;
    await ctx.dbStore.addUser({
      id,
      first_name,
      last_name,
      username,
      language_code,
    });
    return next();
  } as OnMiddleware<'message'>,
);
