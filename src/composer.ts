import {
  Composer as TelegrafComposer,
  Middleware,
  Context as TelegrafContext,
} from 'telegraf';
import { senderIsAdmin } from './guards';
import { deleteMessage } from './middlewares/delete-message';
import { Ctx, GuardPredicate, NonemptyReadonlyArray } from './types';

function mergePredicates<C extends TelegrafContext>(
  predicates: readonly GuardPredicate<C>[],
) {
  return (ctx: C) =>
    Promise.all(predicates.map(p => p(ctx))).then(r => r.every(Boolean));
}

export class Composer<
  C extends TelegrafContext = Ctx
> extends TelegrafComposer<C> {
  static guardAll<C extends TelegrafContext = Ctx>(
    predicates: readonly GuardPredicate<C>[],
    ...fns: NonemptyReadonlyArray<Middleware<C>>
  ) {
    return Composer.optional(mergePredicates(predicates), ...fns);
  }

  static branchAll<C extends Ctx = Ctx>(
    predicates: readonly GuardPredicate<C>[],
    trueBranch: Middleware<C>,
    falseBranch: Middleware<C>,
  ) {
    return Composer.branch(
      mergePredicates(predicates),
      trueBranch,
      falseBranch,
    );
  }

  /**
   * Check command permissions
   * if they don't match and chat settings say "Delete accidental commands",
   * then remove command; otherwise, process command normally
   */
  static adminCommand<C extends Ctx = Ctx>(middleware: Middleware<C>) {
    return Composer.branch(senderIsAdmin, middleware, deleteMessage);
  }

  /** Predicate that returns `true` if all arguments resolve to trueish */
  static allOf<C extends Ctx = Ctx>(...predicates: GuardPredicate<C>[]) {
    return async (ctx: C) => {
      const promises = predicates.map(p => p(ctx));
      const results = await Promise.allSettled(promises);
      return results.every(r => r.status === 'fulfilled' && r.value);
    };
  }

  /** Predicate that returns `true` if any of arguments resolve to trueish */
  static async anyOf<C extends Ctx = Ctx>(...predicates: GuardPredicate<C>[]) {
    return async (ctx: C) => {
      const promises = predicates.map(p => p(ctx));
      const results = await Promise.allSettled(promises);
      return results.some(r => r.status === 'fulfilled' && r.value);
    };
  }

  static async not<C extends Ctx = Ctx>(predicate: GuardPredicate<C>) {
    return async (ctx: C) => {
      const passed = predicate(ctx);
      return !passed;
    };
  }
}
