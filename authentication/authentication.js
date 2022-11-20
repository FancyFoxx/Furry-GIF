/**
 * Passport authentication for persistent login sessions on the web application.
 *
 * @author Fancy Foxx <MrFancyFoxx@Gmail.com>
 */

import { TelegramStrategy } from "passport-telegram-official";
import constants from "../lib/constants.js";
import userController from "../controllers/user.controller.js";
import helpers from "../lib/helpers.js";

export default function(passport) {
	/**
	 * Used to serialize the user for the start of a session load.
	 * @param {User} user - User to be serialized.
	 * @param {function} verified - Callback function for completion of user serialization.
	 */
	passport.serializeUser(function(user, verified) {
		verified(null, user.id);
	});

	/**
	 * Used to deserialize the user at the end of a session load.
	 * @param {string} id - Unique identifier of the User to be deserialized.
	 * @param {function} verified - Callback function for completion of user deserialization.
	 */
	passport.deserializeUser(async function(id, verified) {
		try {
			const user = await userController.readById(id);
			verified(null, user);
		} catch (error) {
			verified(error);
		}
	});

	/**
	 * Local user login setup.
	 * Verifies the provided user credentials. If correct, invoke the callback function with the User object. This will
	 * then be assigned to the `user` field of the Request object, accessible by `request.user`.
	 */
	passport.use("telegram", new TelegramStrategy(
		{
			botToken: process.env.BOT_TOKEN,
			loginExpiration: constants.LOGIN_EXPIRATION_TIME
		},
		async function(query, verified) {
			// Convert Telegram snake_case to camelCase.
			for (const key in query) {
				query[helpers.snakeToCamelCase(key)] = query[key];
			}

			// Check if the user attempting to log in exists. If not, create a new entry.
			let user;
			try {
				user = await userController.save(query);
			} catch (error) {
				verified(error);
				return;
			}

			// If a user's account is disabled, do not permit them to login.
			if (user.disabled) {
				const AccountDisabledError = new Error("Your account has been disabled. You may not login.");
				AccountDisabledError.name = "AccountDisabledError";
				AccountDisabledError.status = 403;
				verified(AccountDisabledError);
				return;
			}

			verified(null, user);
		}
	));
}