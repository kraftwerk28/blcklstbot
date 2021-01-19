use redis::{Client, Commands, Connection, RedisResult};
use teloxide::types::Message;

pub struct RedisStore {
    pub conn: Connection,
}

impl RedisStore {
    async fn new(forget_timeout: i32) -> RedisResult<Self> {
        let client = Client::open("redis://127.0.0.1/")?;
        let conn = client.get_connection()?;
        Ok(Self { conn })
    }

    pub fn remember_msg(&mut self, msg: Message) -> () {
    }
}
