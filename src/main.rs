mod ctx;
mod redis;

use ctx::Ctx;
use std::env;
use teloxide::{
    prelude::*,
    types::{ChatMemberStatus, ParseMode},
    utils::command::*,
};

#[derive(BotCommand, PartialEq, Debug)]
#[command(rename = "lowercase", parse_with = "split")]
enum Command {
    Report,
    Voteban,
    VotebanThreshold(i32),
}

async fn run_ban() {}
async fn run_voteban() {}

async fn report_handler(
    ctx: Ctx,
    cx: UpdateWithCx<Message>,
) -> anyhow::Result<()> {
    if let Some((user, reply)) =
        cx.update.from().zip(cx.update.reply_to_message())
    {
        let user_cm =
            cx.bot.get_chat_member(cx.chat_id(), user.id).send().await?;

        use ChatMemberStatus::*;

        match user_cm.status {
            Administrator | Creator => Ok(()),
            _ => Ok(()),
        }
    } else {
        Ok(())
    }
}

async fn on_message(ctx: Ctx, cx: UpdateWithCx<Message>) -> anyhow::Result<()> {
    if let Some(text) = cx.update.text() {
        match Command::parse(text, &ctx.username)? {
            Command::Report => report_handler(ctx, cx).await,
            Command::Voteban => Ok(()),
            _ => Ok(()),
        }
    } else {
        Ok(())
    }
}

#[tokio::main]
async fn main() {
    dotenv::from_filename(".env").ok();
    pretty_env_logger::init();

    let token = env::var("BOT_TOKEN").unwrap();
    let username = env::var("BOT_USERNAME").unwrap();

    let ctx = Ctx { username };

    let bot = Bot::builder()
        .token(token)
        .parse_mode(ParseMode::HTML)
        .build();

    Dispatcher::new(bot)
        .messages_handler(move |rx: DispatcherHandlerRx<Message>| {
            rx.filter(|message| {
                let isreply = message.update.reply_to_message().is_some();
                async move { isreply }
            })
            .for_each_concurrent(
                None,
                move |message| async move {
                    message.reply_to("With reply").send().await.ok();
                },
            )
        })
        .messages_handler(move |rx: DispatcherHandlerRx<Message>| {
            rx.for_each_concurrent(None, move |message| async move {
                message.reply_to("Plain").send().await.ok();
            })
        })
        .dispatch()
        .await;

    // let ctx = ctx.clone();
    // async move {
    //     on_message(ctx, message).await.ok();
    // }
}
