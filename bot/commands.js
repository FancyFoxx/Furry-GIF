/**
 * Handle receiving commands sent to the Telegram bot.
 *
 * @author Fancy Foxx <MrFancyFoxx@Gmail.com>
 */

import fs from "fs/promises";
import { bot, botHelpers } from "./bot.js";
import gifController from "../controllers/gif.controller.js";

/**
 * Send welcome message with instructions on how to use the bot.
 */
bot.command("start", async (context) => {
	context.reply(
		(await fs.readFile("messages/start.html", {encoding: "utf8"})),
		{parse_mode: "HTML"}
	);
});

/**
 * Send the current user's settings and buttons to change them.
 * @throws 428 Only allow settings modification in direct messages with the bot.
 * @throws 500 An error occurred saving the user who contacted the bot.
 */
bot.command("settings", async (context) => {
	// 428 Only allow settings modification in direct messages with the bot.
	if (context.message.chat.id !== context.from.id) {
		context.reply(
			"Command only valid when directly messaging the bot.",
			{reply_to_message_id: context.message.message_id}
		);
		return;
	}

	// Register/update the User.
	const user = await botHelpers.registerUser(context);
	if (!user) return;

	context.reply(
		`<strong>Settings for ${user.firstName} ${user.lastName}:</strong>\n\nSFW Mode: ${user.sfwMode ? "Enabled" : "Disabled"}`,
		{
			reply_to_message_id: context.message.message_id,
			reply_markup: botHelpers.generateSettingsButtons(user),
			parse_mode: "html"
		}
	);
});

/**
 * Delete the specified Gif.
 * Only a moderator or an administrator can delete a GIF after it's been vetted and approved.
 * @throws 403 The requester is unauthorized to delete the specified GIF.
 * @throws 422 Do not process messages which are not replies to GIFs.
 * @throws 428 Only allow deletion in direct messages with the bot.
 * @throws 500 An error occurred saving the user who contacted the bot.
 * @throws 500 An error occurred deleting the GIF from the database.
 */
bot.command("delete", async (context) => {
	// 428: Only allow deletion in direct messages with the bot
	if (context.message.chat.id !== context.from.id) return;

	// 422: Only process messages that are replies to Gifs.
	if (!context.message.reply_to_message?.animation) {
		context.reply(
			"Please reply to a GIF to delete it.",
			{reply_to_message_id: context.message.message_id}
		);
		return;
	}

	// Register/update the User.
	const user = await botHelpers.registerUser(context);
	if (!user) return;

	// Fetch the existing Gif.
	const gif = await gifController.readById(context.message.reply_to_message.animation.file_unique_id);

	try {
		// Delete the Gif from the database.
		await gifController.delete(user, gif);
		// Delete Gif from conversation.
		await bot.api.deleteMessage(user.id, context.message.reply_to_message.message_id);
		// Delete command message.
		await bot.api.deleteMessage(user.id, context.message.message_id);
		// Send success message.
		context.reply(
			"Successfully deleted Gif."
		);
	} catch (error) {
		console.error("Error deleting Gif.", error, context.message.animation);
		context.reply(
			"An error occurred deleting the GIF. Please try again.",
			{reply_to_message_id: context.message.message_id}
		);
	}
});

