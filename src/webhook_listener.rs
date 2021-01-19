pub async fn make_listener(bot: Bot) -> impl UpdateListener<Infallible> {
    use hyper::{
        service::{make_service_fn, service_fn},
        Body, Request as HyperReq, Response, Server, StatusCode,
    };
    use serde_json::{from_str, Value};

    let (tx, rx) = unbounded_channel();

    let make_svc = make_service_fn(|_| async {
        let tx = tx.clone();
        let service = service_fn(move |req: HyperReq<Body>| {
            let tx = tx.clone();
            async move {
                // let update = from_str::<Value>(req.into_body())
                //     .and_then(|u| Update::try_parse(&u));
                // if let Ok(update) = update {
                //     tx.send(Ok(update)).unwrap();
                // }
                Response::new(Body::from("Hello, {}!"))
                // Response::builder().status(StatusCode::OK).body(())
            }
        });
        Ok::<_, Infallible>(service)
    });

    let srv = Server::bind(&([127, 0, 0, 1], 3000).into()).serve(make_svc);
    // tokio::spawn(move || {
    //     srv.serve(make_svc);
    // });

    rx
}

