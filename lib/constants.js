/**
 * Application constants.
 *
 * @author Fancy Foxx <MrFancyFoxx@Gmail.com>
 */

export default Object.freeze({
	TELEGRAM_USERNAME_STRING_LENGTH: 32, // Max length of a Telegram username.
	MAX_STRING_LENGTH: 64, // An arbitrary max string length for database fields.
	MAX_PARAGRAPH_LENGTH: 1024, // An arbitrary max paragraph length for database fields.
	LOGIN_EXPIRATION_TIME: 86400 * 7 // 7 Days (in seconds).
});