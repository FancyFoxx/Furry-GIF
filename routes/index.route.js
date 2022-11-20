/**
 * Handles requests made to the / root endpoint
 *
 * @author Fancy Foxx <MrFancyFoxx@Gmail.com>
 */

import passport from "passport";
import express from "express";
const router = express.Router();
import { query, validationResult } from "express-validator";
import * as constants from "constants";
import helpers from "../lib/helpers.js";
import {bot, botHelpers} from "../bot/bot.js";
import * as Process from "process";

/* GET home page. */
router.get("/", async function(request, response, next) {
	response.render("pages/index", {title: "Express", user: request.user});
});

/**
 * Handle GET requests to /login
 * Process a login request. Successful logins route users to /gif.
 * @param {number} id - Unique identifier for the given user on Telegram.
 * @param {number} auth_date - Unix timestamp when the authentication was received, in seconds.
 * @param {string} hash - Telegram login verification hash.
 * @param {string} first_name - User's first name on Telegram.
 * @param {string} [last_name] - User's last name on Telegram.
 * @param {string} [username] - User's username on Telegram.
 * @param {string} [photo_url] - URL of the User's avatar icon photo.
 */
router.get("/login",
	query("id")
		.trim()
		.isInt({min: 0})
		.toInt(),
	query("auth_date")
		.trim()
		.isInt()
		.toInt(),
	query("hash")
		.trim()
		.isHash("sha256"),
	query("first_name")
		.trim()
		.stripLow()
		.isLength({min: 1, max: constants.MAX_STRING_LENGTH}),
	query("last_name")
		.optional()
		.trim()
		.stripLow()
		.isLength({min: 1, max: constants.MAX_STRING_LENGTH}),
	query("username")
		.optional()
		.trim()
		.stripLow()
		.isLength({min: 1, max: constants.TELEGRAM_USERNAME_STRING_LENGTH}),
	query("photo_url")
		.optional()
		.trim()
		.isURL(),
	async function (request, response, next) {
		// Check for validation errors.
		const errors = validationResult(request);
		if (!errors.isEmpty()) return response.render("pages/login", {loginErrorMsg: "Login Error", errors: errors.array()});

		passport.authenticate("telegram",(authenticationError, user) => {
			if (authenticationError) throw authenticationError;
			try {
				if (!user) return next();
				request.logIn(user, function(loginError) {
					if (loginError) throw loginError;

					response.redirect("/gif");
				});
			} catch (error) {
				response.status(error.status || 500).render("pages/login", {loginErrorMsg: error.message});
			}
		})(request, response, next);
	}
);

/**
 * Handle GET request to /logout
 * Process logout request and redirect to / index page.
 */
router.get("/logout", function(request, response) {
	request.logout(function(error) {
		if (error) throw error;
	});
	response.redirect("/");
});

/**
 * Handle GET request to /openInTelegram/:fileId
 * Send the requested GIF to the user's Telegram account via the bot. Respond with JSON success/failure message.
 */
router.get("/openInTelegram/:fileId", async function(request, response, next) {
	try {
		await bot.api.sendAnimation(
			request.user.id,
			request.params.fileId
		);

		response.json({
			status: 200,
			detail: "Successfully sent GIF via Telegram."
		});
	} catch (error) {
		// Handle error from Telegram.
		if (!error.message && error.ok === false) {
			console.info(`User ${request.user.id} unable to contact bot. `, error);
			error = new Error("You must contact @FurryGIF_bot in Telegram before the bot can send you GIFs.");
			error.name = "BotContactError";
			error.status = error.error_code;
		}
		throw error;
	}
});


export default router;
