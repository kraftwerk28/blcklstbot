export function captchaHash(chatId: number, userId: number) {
  return `captcha_hash:${chatId}:${userId}`;
}
