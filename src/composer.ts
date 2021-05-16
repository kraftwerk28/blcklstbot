import {
  Composer as TelegrafComposer,
  Middleware,
  Context as TelegrafContext,
} from 'telegraf';
import { Ctx, GuardPredicate, NonemptyReadonlyArray } from './types';

function mergePredicates<C extends TelegrafContext>(
  predicates: readonly GuardPredicate<C>[],
) {
  return (ctx: C) =>
    Promise.all(predicates.map((p) => p(ctx))).then((r) => r.every(Boolean));
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

  static branchAll<C extends TelegrafContext = Ctx>(
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

  // static guardAll<
  //   C extends TelegrafContext = Ctx,
  //   M = unknown,
  //   M2 = Middleware<C> extends M ? M : never
  // >(
  //   predicates: readonly GuardPredicate<C>[],
  //   ...fns: NonemptyReadonlyArray<M2>
  // ) {
  //   const allPredicate = (ctx: C) =>
  //     Promise.all(predicates.map((p) => p(ctx))).then((r) => r.every(Boolean));
  //   return Composer.optional(allPredicate, ...fns);
  // }

  /**
   * Check command permissions
   * if they don't match and chat settings say "Delete accidental commands",
   * then remove command; otherwise, process command normally
   */
  static guardDelete<C extends TelegrafContext = Ctx>(
    predicates: readonly GuardPredicate<C>[],
    middleware: Middleware<C>,
  ) {
    // TODO
  }
}
