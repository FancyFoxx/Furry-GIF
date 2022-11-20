/**
 * Handles requests made to the /gif endpoint
 *
 * @author Fancy Foxx <MrFancyFoxx@Gmail.com>
 */

import https from "https";
import express from "express";
const router = express.Router();
import { body, query, validationResult } from "express-validator";
import { bot } from "../bot/bot.js";
import validator from "validator";
import gifController from "../controllers/gif.controller.js";

/**
 * Handle GET request to /gifs
 * Render all Gifs page.
 * @param {string} tags - Space-separated list of tags by which to search. Special metatags are "rating:".
 * @param {number} [page=1] - Page-offset from which to show Gifs.
 * @param {number} [limit=32] - Maximum number of Gifs to show per page.
 */
router.get(
	"/",
	query("tags")
		.optional()
		.trim()
		.customSanitizer(value => value.toLowerCase().split(" ").filter(elmt => elmt.match(/^-?[a-z][a-z\d_:]+[a-z\d]$/))),
	query("page")
		.optional()
		.trim()
		.isInt({min: 1})
		.toInt(),
	query("limit")
		.optional()
		.trim()
		.toInt()
		.isInt({min: 1}),
	async function(request, response, next) {
		// Retrieve values from query parameters or use defaults.
		let tags = request.query?.tags || [];
		let rating = null;
		const page = request.query?.page || 1;
		const limit = request.query?.limit || 32;

		// Filter out any metatags from tag array.
		if (tags.length) {
			// Rating
			const ratingRegex = /rating:\w+(?:$|\s)/iu;
			rating = request.query.tags.find(elmt => elmt.match(ratingRegex)) || "";
			tags = tags.filter(elmt => !elmt.match(ratingRegex));
			rating = rating.replace("rating:", "") || null;
		}

		try {
			const gifs = await gifController.search(
				request.user, {
				tags: tags,
				rating: rating,
				page: page,
				limit: limit
			});
			const queryString = tags.join(" ") + (rating ? ` rating:${rating}` : "");
			response.render("pages/gifs", {
				user: request.user,
				title: `${queryString ? (queryString + " —") : "Search GIFs"} Furry GIF`,
				gifs: gifs,
				query: queryString,
				page: page,
				limit: limit
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * Handle requests with the gifId parameter.
 * Find the requested Gif from the database and attach it to the request object for use in routes.
 * @param {number} gifId - Database ID number of the requested Gif.
 */
router.param("gifId", async function(request, response, next, gifId) {
	try {
		request.gif = await gifController.readById(gifId);
		next();
	} catch (error) {
		next(error);
	}
});

router.route("/:gifId")
/**
 * Handle GET request to /gifs/:gifId
 * Render specific Gifs page.
 */
.get(async function(request, response, next) {
	response.render("pages/gif", {
		user: request.user,
		title: `${request.gif.fileUniqueId} — Furry GIF`,
		gif: request.gif,
		tags: (await request.gif.tags),
		sources: (await request.gif.sources)
	});
})
/**
 * Handle PATCH request to /gifs/:gifId
 * Update a Gif based on the specified id.
 * @param {string} tags - Space-separated list of tags by which to identify this gif.
 * @param {string} sources - Space-separated list of URLs.
 * @param {string} rating - Rating of the Gif ("safe" or "explicit").
 */
.patch(
	body("tags")
		.trim()
		.customSanitizer(tags => tags.toLowerCase().split(" ").filter(tag => tag.match(/^(?:artist:|character:|species:|copyright:|general:|meta:)?[a-z_\d]+[a-z\d]$/) && validator.isLength(tag, {max: 64}))), // @todo Replace with Constants file.
	body("sources")
		.trim()
		.customSanitizer(sources => sources.toLowerCase().split(" ").filter(source => validator.isURL(source))),
	body("rating", "Invalid rating. Must be \"safe\" or \"explicit\".")
		.trim()
		.customSanitizer(rating => rating.toLowerCase())
		.custom(rating => ["safe", "explicit"].includes(rating)),
	async function(request, response, next) {
		const errors = validationResult(request);
		if (!errors.isEmpty()) {
			return response.status(400).json({
				status: 400,
				detail: errors.array().join(" "),
				errors: errors.array()
			});
		}

		try {
			const gif = await gifController.update(
				request.gif,
				{tags: request.body.tags, sources: request.body.sources, rating: request.body.rating}
			);

			response.json({
				status: 200,
				detail: "Successfully updated Gif",
				gif: gif
			})
		} catch (error) {
			next(error);
		}
	}
)
/**
 * Handle DELETE request to /gifs/:gifId
 * Delete a Gif based on the specified id. Only moderators or administrators can delete Gifs. Original submitters can
 * delete a Gif before it's vetted.
 */
.delete(async function(request, response, next) {
	try {
		await gifController.delete(
			request.user,
			request.gif
		);

		response.status(204).end();
	} catch (error) {
		next(error);
	}
});

/**
 * Handle GET request to /gifs/:gifId/edit
 * Render all Gif edit page.
 */
router.get("/:gifId/edit", async function(request, response, next) {
	response.render("pages/gif-edit", {
		user: request.user,
		title: `Edit ${request.gif.fileUniqueId} — Furry GIF`,
		gif: request.gif,
		tags: (await request.gif.tags),
		sources: (await request.gif.sources)
	});
});

/**
 * Handle GET request to /gifs/:gifId/thumb
 * Send the thumb image for the specified Gif.
 */
router.get("/:gifId/thumb", async function(request, response, next) {
	try {
		// Get the file object from Telegram's servers
		const file = await bot.api.getFile(request.gif.thumbFileId);

		// Request the file data from Telegram's servers
		https.get(`https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`, function(res) {
			let rawResponseBody = [];

			res.on("data", function(chunk) {
				rawResponseBody.push(chunk);
			});

			res.on("end", function() {
				const contentLength = parseInt(res.headers["content-length"]);
				response.append("Content-Length", contentLength);
				response.append("Content-Disposition", "inline");
				response.append("Content-Type", res.headers["content-type"]);

				rawResponseBody = Buffer.concat(rawResponseBody, contentLength);
				response.send(rawResponseBody);
			});
		}).on("error", function(error) {
			console.error("Error retrieving Telegram media. ", error);
			response.json({
				status: 500,
				detail: "Error getting media. Please try again."
			});
		});
	} catch (error) {
		next(error);
	}
});

/**
 * Handle GET request to /gifs/:gifId/file
 * Download the file of the specified Gif.
 */
router.get("/:gifId/file", async function(request, response, next) {
	try {
		// Get the file object from Telegram's servers
		const file = await bot.api.getFile(request.gif.fileId);

		// Request the file data from Telegram's servers
		https.get(`https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`, function(res) {
			let rawResponseBody = [];

			res.on("data", function(chunk) {
				rawResponseBody.push(chunk);
			});

			res.on("end", function() {
				const contentLength = parseInt(res.headers["content-length"]);
				response.append("Content-Length", contentLength);
				response.append("Content-Disposition", "attachment");
				response.append("Content-Type", request.gif.mimeType);

				rawResponseBody = Buffer.concat(rawResponseBody, contentLength);
				response.send(rawResponseBody);
			});
		}).on("error", function(error) {
			console.error("Error retrieving Telegram media. ", error);
			response.json({
				status: 500,
				detail: "Error getting media. Please try again."
			});
		});
	} catch (error) {
		next(error);
	}
});

export default router;
