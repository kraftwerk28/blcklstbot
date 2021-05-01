import { OnMiddleware } from '../types';

type Middleware = OnMiddleware<'text'>

export const bangCommand: Middleware = async function(ctx, next) {
}
