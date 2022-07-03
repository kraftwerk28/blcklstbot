import { Composer } from '../composer';
import { botHasSufficientPermissions, isGroupChat } from '../guards';
import { HearsMiddleware } from '../types';

export const demoCaptcha: HearsMiddleware = Composer.optional(
  Composer.allOf(botHasSufficientPermissions, isGroupChat),
  async function (ctx) {
    // TODO: implement
  },
);
