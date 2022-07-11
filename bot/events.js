/**
 * Event handlers for the Telegram bot.
 *
 * @author Fancy Foxx <MrFancyFoxx@Gmail.com>
 */

import { bot, botHelpers } from "./bot.js";
import helpers from "../lib/helpers.js";
import gifController from "../controllers/gif.controller.js";
import userController from "../controllers/user.controller.js";
import validator from "validator";

/**
 * Search Gifs that match the provided query.
 * If no query is provided, match all Gifs.
 * @throws 500 An error occurred saving the User who contacted the bot.
 * @throws 500 An error occurred finding the Gifs in the database.
 */
bot.on("inline_query", async (context) => {
	// Register/update the User.
	const user = await botHelpers.registerUser(context);
	if (!user) return;

	// Query the database
	let tags = [];
	let rating = null;
	const tokenArray = context.inlineQuery.query.trim().toLowerCase().split(/\s+/).filter(token => token.match(/^-?[a-z][a-z\d_:]+[a-z\d]$/));
	// Filter out any metatags from tag array.
	if (tokenArray.length) {
		// Rating
		const ratingRegex = /rating:\w+(?:$|\s)/iu;
		rating = tokenArray.find(token => token.match(ratingRegex)) || "";
		tags = tokenArray.filter(token => !token.match(ratingRegex));
		rating = rating.replace("rating:", "") || null;
	}
	try {
		const gifs = await gifController.search(
			user, {
			tags: tags,
			rating: rating
		});
		const queryResponses = [];
		for (const gif of gifs) {
			queryResponses.push({
				type: "gif",
				id: gif.fileUniqueId,
				gif_file_id: gif.fileId,
				caption: `<a href="${process.env.SITE_NAME}/gif/${gif.fileUniqueId}">Via FurryGIF</a>`,
				parse_mode: "html"
			});
		}
		await context.answerInlineQuery(queryResponses, {cache_time: 5}) // @todo: bump-up cache time in production.
	} catch (error) {
		console.error("Error performing inline query.", error);
	}
});

/**
 * Process tagging GIFs.
 * When text is received by the bot, it should only be for tagging GIFs.
 * Respond with a list of newly updated tags, sources, and content rating.
 * @throws 422 Do not process commands nor process messages which are not replies to GIFs.
 * @throws 428 Do not process messages from group chats nor the bot itself.
 * @throws 500 An error occurred saving the user who contacted the bot.
 * @throws 500 An error occurred saving the GIF in the database.
 */
bot.on("message:text", async (context) => {
	// 428: Do not process messages from group chats.
	if (context.chat.type !== "private") return;

	// Only process text-type messages that are replies to GIFs.
	if (!context.message.reply_to_message?.animation) {
		context.reply(
			"Please reply to a GIF to update its tags and source.",
			{reply_to_message_id: context.message.message_id}
		);
		return;
	}

	// Register/update the User.
	const user = await botHelpers.registerUser(context);
	if (!user) return;

	// Update tags and sources for the gif.
	const tokenArray = context.message.text.trim().toLowerCase().split(/\s+/);
	let gif;
	let finalTags;
	let finalSources;
	try {
		gif = await gifController.readById(context.message.reply_to_message.animation.file_unique_id);

		const tagChanges = tokenArray
			.filter(token => token.match(/^-?[a-z][a-z\d_]+[a-z\d]$/) && validator.isLength(token, {max: 64}));  // @todo replace with constant
		// Create an array that'll hold the final list of tags to apply to the Gif. Parse through the array of provided tag
		// changes and apply them to the existing list of tags.
		finalTags = (await gif.tags).map(tag => tag.tag) || []; // We only need the strings of the tag names to compare.
		for (let tagName of tagChanges) {
			// If tag is denoted for removal, delete it from the array of final tags.
			if (tagName.startsWith("-")) {
				tagName = tagName.substring(1); // Remove leading -.
				const index = finalTags.findIndex(existingTag => existingTag === tagName);
				if (index !== -1) finalTags.splice(index, 1);
				continue;
			}
			// If a new tag is not found in the array of existing tags, add it.
			if (!finalTags.find(existingTag => existingTag === tagName)) finalTags.push(tagName);
		}

		const sourceChanges = tokenArray
			.filter(token => token.match(/-?src:.+/));
		// Create an array that'll hold the final list of sources to apply to the Gif. Parse through the array of provided
		// source changes and apply them to the existing list of sources.
		finalSources = (await gif.sources).map(source => source.source) || []; // We only need the strings of the source urls to compare.
		for (let sourceUrl of sourceChanges) {
			// If source is denoted for removal, delete it from the array of final sources.
			if (sourceUrl.startsWith("-")) {
				sourceUrl = sourceUrl.substring(5); // Remove leading `-src:`.
				// Validate URL
				if (!validator.isURL(sourceUrl) || !validator.isLength(sourceUrl, {max: 64 * 2})) continue;  // @todo replace with constant
				const index = finalSources.findIndex(existingSource => existingSource === sourceUrl);
				if (index !== -1) finalSources.splice(index, 1);
				continue;
			}
			sourceUrl = sourceUrl.substring(4); // Remove leading `src:`.
			// Validate URL
			if (!validator.isURL(sourceUrl) || !validator.isLength(sourceUrl, {max: 64 * 2})) continue;  // @todo replace with constant
			// If a new source is not found in the array of existing sources, add it.
			if (!finalSources.find(existingSource => existingSource === sourceUrl)) finalSources.push(sourceUrl);
		}

		gif = await gifController.update(gif, {tags: finalTags, sources: finalSources});
	} catch (error) {
		console.error("Error saving Gif.", error, context.from);
		context.reply(
			"An error occurred saving your GIF. Please try again.",
			{reply_to_message_id: context.message.message_id}
		);
		return;
	}

	// Send confirmation of update.
	bot.api.sendAnimation(
		context.from.id,
		gif.fileId,
		{
			caption: `Successfully updated!\n\nTags:\n${finalTags.map((tag) => tag.tag).join(" ")}\n\nSources: ${finalSources.join("\n")}\n\nRating: ${gif.rating}`,
			reply_markup: botHelpers.generateRatingButtons(gif.fileUniqueId)
		}
	);
	// Delete old version of Gif from conversation.
	bot.api.deleteMessage(user.id, context.message.reply_to_message.message_id);
	// Delete command message.
	bot.api.deleteMessage(user.id, context.message.message_id);
});

/**
 * When an animation message is received by the bot, save it in the Gif library. Record the user who sent the message so
 * their saved GIFs can be linked backed to them.
 * @throws 428 Do not process messages from group chats nor the bot itself.
 * @throws 500 An error occurred saving the User who contacted the bot.
 * @throws 500 An error occurred saving the Gif in the database.
 */
bot.on("message:animation", async (context) => {
	// 428: Do not process messages from group chats.
	if (context.chat.type !== "private") return;

	// 428: Do not process messages from the bot itself.
	if (context.message.caption?.includes("FurryGIF")) return;

	// Register/update the User.
	const user = await botHelpers.registerUser(context);
	if (!user) return;

	// Flatten the message.gif object.
	for (const key in context.message.animation.thumb) {
		context.message.animation[`thumb_${key}`] = context.message.animation.thumb[key];
	}
	// Convert Telegram snake_case to camelCase.
	for (const key in context.message.animation) {
		context.message.animation[helpers.snakeToCamelCase(key)] = context.message.animation[key];
	}
	let gif;
	try {
		gif = await gifController.create(user, context.message.animation);
	} catch (error) {
		console.error("Error saving Gif.", error, context.from);
		context.reply(
			"An error occurred saving your GIF. Please try again.",
			{reply_to_message_id: context.message.message_id}
		);
		return;
	}

	// Send confirmation of addition.
	bot.api.sendAnimation(
		context.from.id,
		gif.fileId,
		{
			caption: "Successfully saved GIF!\n\nSet its tags by replying to the GIF above with a space-separated list of tags.",
			reply_markup: botHelpers.generateRatingButtons(gif.fileUniqueId)
		}
	);
	// Delete originally sent Gif from conversation.
	bot.api.deleteMessage(user.id, context.message.message_id);
});

/**
 * Set the content rating for the specified GIF.
 * Update the message from which this response originated with the updated content rating, tags, and sources.529  * @param {Object} queryResponse - Query response from Telegram.
 * @param {Object} context.callbackQuery - Query response from Telegram.
 * @param {string} context.callbackQuery.data - Formatted string containing the function name (`SetRating`), content rating value, and unique file ID of the Gif to be rated. All three values are separated by `:`.
 * @throws 500 An error occurred saving the GIF in the database.
 */
bot.callbackQuery(/setRating:\w+:\w+/, async (context) => {
	const rating = context.callbackQuery.data.split(":")[1];
	let gif;
	try {
		gif = await gifController.readById(context.callbackQuery.data.split(":")[2]);
		gif = await gifController.update(gif, {rating: rating});
	} catch (error) {
		if (error.description?.startsWith("Bad Request: message is not modified")) {
			console.error("Error updating the GIF's rating.", error, gif);
			context.answerCallbackQuery({
				text: error.message,
				show_alert: true
			});
		}
		return;
	}

	context.answerCallbackQuery({
		text: "Successfully updated content rating"
	});
	await bot.api.editMessageMedia(
		context.callbackQuery.from.id,
		context.callbackQuery.message.message_id,
		{
			type: "animation",
			media: context.callbackQuery.message.animation.file_id,
			caption: `Successfully updated!\n\nTags:\n${(await gif.tags).map(tag => tag.tag).join(" ")}\n\nSources: ${(await gif.sources).map(source => source.source).join("\n")}\n\nRating: ${gif.rating}`, // @todo Create function to generate this string.
		}, {
			reply_markup: botHelpers.generateRatingButtons(gif.fileUniqueId)
		}
	);
});

/**
 * Update the specified setting for the requesting user.
 * Update the message from which this response originated with the updated settings.
 * @param {Object} context.callbackQuery - Query response from Telegram.
 * @param {string} context.callbackQuery.data - Formatted string containing the function name (`settings`), setting name, and setting value. All three values are separated by `:`.
 * @throws 500 An error occurred saving user's settings.
 */
bot.callbackQuery(/settings:\w+:\w+/, async (context) => {
	const [, setting, value] = context.callbackQuery.data.split(":");

	let user;
	switch (setting) {
		case "sfwMode":
			const sfwMode = value === "true";
			try {
				user = await userController.save({id: context.from.id, sfwMode: sfwMode});
			} catch (error) {
				console.error("Error updating a User's sfw setting.", error, user);
				context.answerCallbackQuery({
					text: error.message,
					show_alert: true
				});
			}
		break;
	}

	context.answerCallbackQuery({text: "Settings saved"});
	await bot.api.editMessageText(
		user.id,
		context.callbackQuery.message.message_id,
		`<strong>Settings for ${user.firstName} ${user.lastName}:</strong>\n\nSFW Mode: ${user.sfwMode ? "Enabled" : "Disabled"}`,
		{
			reply_markup: botHelpers.generateSettingsButtons(user),
			parse_mode: "html"
		}
	);
});

/**
 * Handle erroneous callbackQuery response.
 */
bot.on("callback_query:data", async (context) => {
	console.log("Unknown button event with payload.", context.callbackQuery.data);
	await context.answerCallbackQuery();
});
