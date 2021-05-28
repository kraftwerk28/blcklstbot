import { log } from '../logger';
import { OnMiddleware } from '../types';
import { noop } from '../utils';

type Mw = OnMiddleware<'chosen_inline_result'>;

export const onChosenInlineResult: Mw = async function (ctx, next) {
  const { chosenInlineResult } = ctx;
  log.info(chosenInlineResult);
  // const metadata = await ctx.dbStore.getInlineResultMeta(
  //   chosenInlineResult.result_id,
  // );
  // await editInlineMessateWithMeta(ctx, metadata);
  // ctx.tg
  //   .editMessageText(
  //     undefined,
  //     undefined,
  //     chosenInlineResult.inline_message_id,
  //     `Message was edited. Result "${chosenInlineResult.result_id}" was chosen`,
  //   )
  //   .catch(noop);
};
