#!/usr/bin/env node
'use strict';
const IORedis = require('ioredis');
const { EventEmitter } = require('events')

const client = new IORedis();
const pubsubClient = new IORedis();
pubsubClient.disconnect();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// class PersistTimer extends EventEmitter {
//   constructor(connection) {
//     /** @type {import('ioredis').Redis} */
//     this.redis = connection;
//     /** @type {Set<number>} */
//     this.timeIds = new Set;
//     this._redisSetKey = 'tim';
//   }

//   _restore() {
//     // const timers = await this.redis.
//   }

//   async schedule(seconds, payload) {
//     const cb = () => {
//       this.emit('notify', payload);
//     };
//     const expTimestamp = Math.floor(Date.now() / 1000) + seconds;
//     const key = `tim:${expTimestamp}`;
//     await this.redis.setex(key, seconds, payload);
//     await this.redis.sadd(this._redisSetKey, )
//     setTimeout(cb, secs * 1000);
//   }
// }

(async () => {
  // console.log('Sub: %O', await pubsubClient.psubscribe('__key*__:*'));
  // pubsubClient.on('Key %s expired.', (chan, msg, key) => {
  //   console.log('key %s expired', key);
  // });

  // await client.set('foo', 'bar');
  // await client.expire('foo', 1);
  // await sleep(2000);

  // console.log('Unsub: %O', await pubsubClient.punsubscribe('__key*__:*'));
  console.log(await client.get('foo'))

  client.disconnect();
})();
