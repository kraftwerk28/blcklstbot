import {
  Composer as TelegrafComposer,
  Middleware,
  Context as TelegrafContext,
} from 'telegraf';
import { Ctx, GuardPredicate, NonemptyReadonlyArray } from './types';

export class Composer<
  C extends TelegrafContext = Ctx
> extends TelegrafComposer<C> {
  static guardAll<C extends TelegrafContext = Ctx>(
    predicates: readonly GuardPredicate<C>[],
    ...fns: NonemptyReadonlyArray<Middleware<C>>
  ) {
    const allPredicate = (ctx: C) =>
      Promise.all(predicates.map((p) => p(ctx))).then((r) => r.every(Boolean));
    return Composer.optional(allPredicate, ...fns);
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
}
