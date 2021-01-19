#[derive(Clone)]
pub struct Ctx {
    pub username: String,
}

impl Ctx {
    pub fn new(username: String) -> Self {
        Self { username }
    }
}
