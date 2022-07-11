/**
 * Functions to manipulate Gif objects.
 *
 * @author Fancy Foxx <MrFancyFoxx@Gmail.com>
 */

import Gif from "../models/Gif.js";
import Tag from "../models/Tag.js";
import createError from "http-errors";

class GifController {
	/**
	 * Create a Gif in the database. If the Gif already exists, return the existing Gif.
	 * @param {User} requester - User sending the Gif.
	 * @param {Object} properties - Gif properties.
	 * @param {string} properties.fileId - Download identifier for this file.
	 * @param {string} properties.fileUniqueId - Unique identifier for this file.
	 * @param {number} properties.width - Animation width.
	 * @param {number} properties.height - Animation height.
	 * @param {number} properties.duration - Duration of the animation in seconds.
	 * @param {string} properties.fileName - Original animation filename.
	 * @param {string} properties.mimeType - MIME type of the file.
	 * @param {number} properties.fileSize - File size in bytes.
	 * @param {string} properties.thumbFileId - Download identifier for thumbnail file of the animation.
	 * @param {string} properties.thumbFileUniqueId - Unique identifier for thumbnail file of the animation.
	 * @param {number} properties.thumbWidth - Thumbnail photo width.
	 * @param {number} properties.thumbHeight - Thumbnail photo height.
	 * @param {number} properties.thumbFileSize - Thumbnail file size in bytes.
	 * @returns {Promise<Gif>}
	 */
	static async create(requester, properties) {
		let gif = await Gif.readById(properties.fileUniqueId);
		if (gif) return gif;
		// noinspection JSUndefinedPropertyAssignment
		properties.uploadedById = requester.id;
		gif = new Gif(properties);
		await gif.create();
		return gif;
	}

	/**
	 * Search Gifs from the database identified by the provided query data. If the requester has Safe For Work Mode
	 * enabled on their account, only Gifs with a content rating of "safe" will be searched.
	 * @param {User} requester - User requesting to search Gifs.
	 * @param {Object} queryData - Search criteria.
	 * @param {string[]} [queryData.tags=[]] - Tags by which to match Gifs.
	 * @param {string} [queryData.rating=null] - Content rating to limit to.
	 * @param {number} [queryData.page=1] - Pagination offset (1-indexed).
	 * @param {number} [queryData.limit=32] - Number of Gifs to retrieve.
	 * @returns {Promise<Gif[]>} Array of Gifs matched.
	 */
	static async search(requester, {tags = [], rating = null, page = 1, limit = 32} = {}) {
		if (requester.sfwMode) rating = "safe";
		return await Gif.search({tags: tags, rating: rating, page: (page - 1), limit: limit});
	}

	/**
	 * Fetch a Gif from the database by the specified ID.
	 * @param gifId - Unique identifier for this file.
	 * @returns {Promise<Gif|HttpError>} Gif object if found; else HttpError.
	 */
	static async readById(gifId) {
		const gif = await Gif.readById(gifId);
		if (!gif) throw createError(404, "Gif not found.");
		return gif;
	}

	/**
	 * Update the provided Gif with the provided changes.
	 * @param {Gif} gif - Gif to be updated.
	 * @param {Object} changes - Gif properties to update.
	 * @param {string} [changes.rating] - Content rating.
	 * @param {string[]} [changes.tags] - Updated list of tags.
	 * @param {string[]} [changes.sources] - Updated list of sources.
	 * @returns {Promise<Gif>} Updated version of Gif.
	 */
	static async update(gif, changes) {
		if (changes.rating) {
			gif.rating = changes.rating;
			await gif.update();
		}

		if (changes.tags) {
			// Convert provided tag names to Tag objects.
			for (let i = 0, length = changes.tags.length; i < length; i++) {
				const tagName = changes.tags[i];
				let tag = await Tag.readByTagName(tagName);
				// If an existing Tag (or associated alias) is not found, create it.
				if (!tag) {
					tag = new Tag({tag: tagName});
					await tag.create();
				}
				changes.tags[i] = tag;
			}
			gif.tags = changes.tags;
		}

		if (changes.sources) {
			gif.sources = changes.sources;
		}

		return gif;
	}

	/**
	 * Delete the provided Gif from the database.
	 * @param {User} requester - User requesting to delete the Gif.
	 * @param {Gif} gif - Gif to be deleted.
	 * @returns {Promise<void>} - Successfully deleted Gif.
	 */
	static async delete(requester, gif) {
		if (requester.id === gif.uploadedById || ["moderator", "administrator"].includes(requester.role)) {
			await gif.delete();
			return;
		}
		throw createError(401, "Unauthorized. Only moderators or administrators can delete GIFs. Original submitters can delete a GIF before it's vetted.");
	}
}

export default GifController;