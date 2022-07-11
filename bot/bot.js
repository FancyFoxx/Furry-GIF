/**
 * Configure and start the Telegram bot.
 *
 * @author Fancy Foxx <MrFancyFoxx@Gmail.com>
 */
import { Bot, GrammyError, HttpError, InlineKeyboard } from "grammy";
import helpers from "../lib/helpers.js";
import User from "../models/User.js";
import userController from "../controllers/user.controller.js";

// Verify a Bot Token was provided.
if (!("BOT_TOKEN" in process.env)) {
	console.error("No Bot Token was provided in the .env file.");
	process.exit(1);
}

// Configure and start the bot.
const bot = new Bot(process.env.BOT_TOKEN);
bot.start().catch(error => {
	console.error("Bot failed to start.", error);
	process.exit(1);
});
console.info("Bot Started");

// Error handler.
bot.catch(async (error) => {
	const context = error.ctx;
	console.error(`Error while handling update ${context.update.update_id}:`);
	const e = error.error;
	if (e instanceof GrammyError) {
		// If a user blocked the bot or deactivated their account, they won't receive messages. Delete them from the bot.
		if (e.description.includes("blocked") || e.description.includes("deactivated")) {
			const user = new User({id: e.payload.chat_id});
			await user.delete();
		} else if (e.description.includes("message is not modified")) {
			// No action necessary.
		} else {
			console.error("Error in request:", e);
		}
	} else if (e instanceof HttpError) {
		console.error("Could not contact Telegram:", e);
	} else {
		console.error("Unknown error:", e);
	}
});

export { bot };

export const botHelpers = {
	registerUser: async function(context) {
		// Register/update the user.
		let user;
		// Convert Telegram snake_case to camelCase.
		for (const key in context.from) {
			context.from[helpers.snakeToCamelCase(key)] = context.from[key];
		}
		try {
			user = await userController.save(context.from);
			return user;
		} catch (error) {
			console.error("Error saving user who contacted bot.", error, context.from);
			// noinspection ES6MissingAwait
			context.reply("An error occurred saving your GIF. Please try again.");
			return null;
		}
	},
	generateRatingButtons: function(fileUniqueId) {
		return new InlineKeyboard()
			.text("Safe", `setRating:safe:${fileUniqueId}`)
			.text("Explicit", `setRating:explicit:${fileUniqueId}`);
	},
	generateSettingsButtons: function(user) {
		return new InlineKeyboard()
			.text(`SFW Mode: ${user.sfwMode ? "✅" : "🔞"}`, `settings:sfwMode:${!user.sfwMode}`);
	}
};

