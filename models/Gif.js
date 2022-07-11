/**
 * Models the Gif table in database.
 *
 * @author Fancy Foxx <MrFancyFoxx@Gmail.com>
 */

import DB from "./DB.js";
import Source from "./Source.js";
import Tag from "./Tag.js";
import User from "./User.js";

/**
 * A Gif represents a single animation file that's been added to the library of Gifs.
 * @class
 */
class Gif {

	/**
	 * Identifier for this file, which can be used to download or reuse the file from Telegram's servers.
	 * @instance
	 * @type {string}
	 */
	fileId;
	/**
	 * Unique identifier for this file, which is supposed to be the same over time and for different bots. Can't be used
	 * to download or reuse the file from Telegram's servers.
	 * @instance
	 * @type {string}
	 */
	fileUniqueId;
	/**
	 * Animation width.
	 * @instance
	 * @type {number}
	 */
	width;
	/**
	 * Animation height.
	 * @instance
	 * @type {number}
	 */
	height;
	/**
	 * Duration of the animation in seconds.
	 * @instance
	 * @type {number}
	 */
	duration;
	/**
	 * Optional. Original animation filename as defined by sender.
	 * @instance
	 * @type {string}
	 */
	fileName;
	/**
	 * Optional. MIME type of the file.
	 * @instance
	 * @type {number}
	 */
	mimeType;
	/**
	 * Optional. File size in bytes.
	 * @instance
	 * @type {number}
	 */
	fileSize;
	/**
	 * Identifier for thumbnail file of the animation, which can be used to download or reuse the thumbnail file from
	 * Telegram's servers.
	 * @instance
	 * @type {string}
	 */
	thumbFileId;
	/**
	 * Unique identifier for thumbnail file of the animation, which is supposed to be the same over time and for
	 * different bots. Can't be used to download or reuse the thumbnail file from Telegram's servers.
	 * @instance
	 * @type {string}
	 */
	thumbFileUniqueId;
	/**
	 * Thumbnail photo width.
	 * @instance
	 * @type {number}
	 */
	thumbWidth;
	/**
	 * Thumbnail photo height.
	 * @instance
	 * @type {number}
	 */
	thumbHeight;
	/**
	 * Thumbnail file size in bytes.
	 * @instance
	 * @type {number}
	 */
	thumbFileSize;
	/**
	 * Content rating for the animation. Can be either "safe" or "explicit"..
	 * @instance
	 * @type {string}
	 */
	rating;
	/**
	 * ID of the user who uploaded the animation.
	 * @instance
	 * @type {number}
	 */
	uploadedById;
	/**
	 * ID of the user who approved the animation
	 * @instance
	 * @type {number}
	 */
	approvedById;

	/**
	 * Fetch specific Gif from the database identified by its uniqueFileId.
	 * @param {string} fileUniqueId - ID by which to fetch Gif.
	 * @returns {Promise<Gif|null>} Gif object if found; else null.
	 * @throws {GifCreateError} 500 An error occurred reading the Gif from the database.
	 */
	static async readById(fileUniqueId) {
		try {
			const sql = "SELECT * FROM Gif WHERE fileUniqueId = ?";
			const resultSet = await DB.getData(sql, [fileUniqueId]);
			if (!resultSet.rows.length) return null;
			return new Gif(resultSet.rows[0]);
		} catch (error) {
			const GifReadError = new Error("Error reading Gif from database.", {cause: error});
			GifReadError.name = "GifReadError";
			GifReadError.status = 500;
			throw GifReadError;
		}
	}

	/**
	 * Fetch Gifs from the database identified by the provided query data. Only content-rated, approved Gifs are returned.
	 * @param {Object} queryData
	 * @param {string[]} [queryData.tags=[]] - Tags by which to match Gifs.
	 * @param {string} [queryData.rating=null] - Content rating to limit to.
	 * @param {number} [queryData.page=0] - Pagination offset (0-indexed).
	 * @param {number} [queryData.limit=32] - Number of Gifs to retrieve.
	 * @returns {Promise<Gif[]>} Array of Gifs matched.
	 * @throws {GifReadError} 500 An error occurred reading Gifs from the database.
	 */
	static async search({tags = [], rating = null, page = 0, limit = 32} = {}) {
		const includeTags = tags.filter(tag => !tag.startsWith("-"));
		const negateTags = tags.filter(tag => tag.startsWith("-"));

		let sql = `
			SELECT DISTINCT Gif.*
			FROM Gif
			JOIN GifTag
			ON Gif.fileUniqueId = GifTag.fileUniqueId
			JOIN Tag
			ON GifTag.tag = Tag.tag
			LEFT JOIN TagAlias
			ON Tag.tag = TagAlias.tag
			WHERE Gif.rating IS NOT NULL
		`;
		if (rating) sql += "AND Gif.rating = ?";

		if (tags.length) {
			sql += " AND ";
		}

		if (includeTags.length) {
			let includeTagPlaceholders = "";
			for (let i = 0, length = includeTags.length; i < length; i++) {
				includeTagPlaceholders += "?, ";
			}
			includeTagPlaceholders = includeTagPlaceholders.slice(0, -2);
			sql += `(Tag.tag IN (${includeTagPlaceholders}) OR TagAlias.alias IN (${includeTagPlaceholders}))`;
		}

		if (includeTags.length && negateTags.length) {
			sql += " AND ";
		}

		if (negateTags.length) {
			let negateTagPlaceholders = "";
			for (let i = 0, length = negateTags.length; i < length; i++) {
				negateTagPlaceholders += "?, ";
			}
			negateTagPlaceholders = negateTagPlaceholders.slice(0, -2);
			sql += `Gif.fileUniqueId NOT IN (
				SELECT Gif.fileUniqueId
				FROM Gif
				JOIN GifTag
				ON Gif.fileUniqueId = GifTag.fileUniqueId
				JOIN Tag
				ON GifTag.tag = Tag.tag
				LEFT JOIN TagAlias
				ON Tag.tag = TagAlias.tag
				WHERE (
					Tag.tag IN (${negateTagPlaceholders}) OR TagAlias.alias IN (${negateTagPlaceholders})
				)`;
		}

		if (includeTags.length) {
			sql += ` GROUP BY Gif.fileUniqueId HAVING COUNT(Gif.fileUniqueId)=${includeTags.length}`;
		}

		sql += ` LIMIT ? OFFSET ?`;

		let values = [];
		if (rating) values.push(rating);
		values = values
			.concat(includeTags)
			.concat(includeTags)
			.concat(negateTags)
			.concat(negateTags)
		values.push(limit);
		values.push(limit * page);

		try {
			const resultSet = await DB.getData(sql, values);
			return resultSet.rows.map(gif => new Gif(gif));
		} catch (error) {
			const GifReadError = new Error("Error reading Gifs from database.", {cause: error});
			GifReadError.name = "GifReadError";
			GifReadError.status = 500;
			throw GifReadError;
		}
	}

	/**
	 * Creates a Gif object.
	 * @param {Object} properties - Initialization properties for the Gif.
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
	 * @param {string} properties.rating - Content rating for the animation.
	 * @param {number} [properties.uploadedById] - User who submitted the animation.
	 * @param {number} [properties.approvedById] - User who vetted and approved the animation.
	 */
	constructor(properties) {
		this.fileId = properties.fileId;
		this.fileUniqueId = properties.fileUniqueId;
		this.width = properties.width;
		this.height = properties.height;
		this.duration = properties.duration;
		this.fileName = properties.fileName || null;
		this.mimeType = properties.mimeType || null;
		this.fileSize = properties.fileSize || null;
		this.thumbFileId = properties.thumbFileId;
		this.thumbFileUniqueId = properties.thumbFileUniqueId;
		this.thumbWidth = properties.thumbWidth;
		this.thumbHeight = properties.thumbHeight;
		this.thumbFileSize = properties.thumbFileSize || null;
		this.rating = properties.rating || null;
		this.uploadedById = properties.uploadedById;
		this.approvedById = properties.approvedById || null;
	}

	/**
	 * Create a Gif entry in the database.
	 * @returns {Promise} Successful database insertion.
	 * @throws {GifCreateError} 500 An error occurred inserting the Gif in the database.
	 */
	async create() {
		try {
			const sql = `INSERT INTO Gif(
					fileId,
					fileUniqueId,
					width,
					height,
					duration,
					fileName,
					mimeType,
					fileSize,
					thumbFileId,
					thumbFileUniqueId,
					thumbWidth,
					thumbHeight,
					thumbFileSize,
					rating,
					uploadedById
                )
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
			await DB.setData(sql,
				[
					this.fileId,
					this.fileUniqueId,
					this.width,
					this.height,
					this.duration,
					this.fileName,
					this.mimeType,
					this.fileSize,
					this.thumbFileId,
					this.thumbFileUniqueId,
					this.thumbWidth,
					this.thumbHeight,
					this.thumbFileSize,
					this.rating,
					this.uploadedById
				]
			);
		} catch (error) {
			const GifCreateError = new Error("Error inserting Gif in database.", {cause: error});
			GifCreateError.name = "GifCreateError";
			GifCreateError.status = 500;
			throw GifCreateError;
		}
	}

	/**
	 * Update a Gif entry in the database. Only rating and approvedById fields are modified.
	 * @returns {Promise} Successful database update.
	 * @throws {GifUpdateError} 500 An error occurred updating the Gif in the database.
	 */
	async update() {
		try {
			const sql = `UPDATE Gif SET rating = ?, approvedById = ? WHERE fileUniqueId = ?`;
			await DB.setData(sql, [this.rating, this.approvedById, this.fileUniqueId]);
		} catch (error) {
			const GifUpdateError = new Error("Error updating Gif in database.", {cause: error});
			GifUpdateError.name = "GifUpdateError";
			GifUpdateError.status = 500;
			throw GifUpdateError;
		}
	}

	/**
	 * Delete a Gif entry from the database.
	 * @returns {Promise} Successful database deletion.
	 * @throws {GifDeleteError} 500 An error occurred deleting the Gif from the database.
	 */
	async delete() {
		try {
			const sql = `DELETE FROM Gif WHERE fileUniqueId = ?`;
			await DB.setData(sql, [this.fileUniqueId]);
		} catch (error) {
			const GifDeleteError = new Error("Error deleting Gif from database.", {cause: error});
			GifDeleteError.name = "GifDeleteError";
			GifDeleteError.status = 500;
			throw GifDeleteError;
		}
	}

	/**
	 * Read all Tags for this Gif from the database.
	 * @returns {Promise<Tag[]>}
	 * @throws {GifReadTagsError} 500 An error occurred reading Tags for the Gif from the database.
	 */
	get tags() {
		return (async () => {
			const sql = "SELECT tag FROM GifTag WHERE fileUniqueId = ?";
			try {
				const resultSet = await DB.getData(sql, [this.fileUniqueId]);
				return resultSet.rows.map(row => new Tag(row));
			} catch (error) {
				const GifReadTagsError = new Error("Error reading Tags for Gif from database.", {cause: error});
				GifReadTagsError.name = "GifReadTagsError";
				GifReadTagsError.status = 500;
				throw GifReadTagsError;
			}
		})();
	}

	/**
	 * Update list of Tags for Gif in the database.
	 * @param {Tag[]} newTagsList
	 * @returns {Promise} Successfully updated Tags in database.
	 * @throws {GifTagCreateError} 500 An error occurred adding Tags to the Gif in the database.
	 * @throws {GifTagDeleteError} 500 An error occurred deleting removed Tags for the Gif from the database.	 */
	set tags(newTagsList) {
		(async () => {
			// Add new tags.
			const addTagCalls = [];
			const addTagsSql = "INSERT INTO GifTag (fileUniqueId, tag) VALUES (?, ?)";
			// Parse new tags list and find if any were added from the existing tags.
			for (const newTag of newTagsList) {
				const found = (await this.tags).find(existingTag => newTag.tag === existingTag.tag);
				// If not found, add make tag calls to array.
				if (typeof found === "undefined") addTagCalls.push(DB.setData(addTagsSql, [this.fileUniqueId, newTag.tag]));
			}
			// Wait for array of database calls to complete.
			try {
				await Promise.all(addTagCalls);
			} catch (error) {
				const GifTagAddError = new Error("Error adding Tags to Gif in database", {cause: error});
				GifTagAddError.name = "GifTagAddError";
				GifTagAddError.status = 500;
				throw GifTagAddError;
			}

			// Remove deleted tags.
			const deleteTagCalls = [];
			const deleteTagsSql = "DELETE FROM GifTag WHERE fileUniqueId = ? AND tag = ?";
			// Parse existing tags and find if any were removed in the new tags list.
			for (const existingTag of (await this.tags)) {
				const found = newTagsList.find(newTag => existingTag.tag === newTag.tag);
				// If not found, add delete tag calls to array.
				if (typeof found === "undefined") deleteTagCalls.push(DB.setData(deleteTagsSql, [this.fileUniqueId, existingTag.tag]));
			}
			// Wait for array of database calls to complete.
			try {
				await Promise.all(deleteTagCalls);
			} catch (error) {
				const GifTagDeleteError = new Error("Error deleting Tags for Gif from database", {cause: error});
				GifTagDeleteError.name = "GifTagDeleteError";
				GifTagDeleteError.status = 500;
				throw GifTagDeleteError;
			}
		})();
	}

	/**
	 * Read all Sources for this Gif from the database.
	 * @returns {Promise<Source[]>}
	 * @throws {GifReadSourcesError} 500 An error occurred reading Sources for the Gif from the database.
	 */
	get sources() {
		return (async () => {
			const sql = "SELECT source, fileUniqueId FROM Source WHERE fileUniqueId = ?";
			try {
				const resultSet = await DB.getData(sql, [this.fileUniqueId]);
				return resultSet.rows.map(row => new Source(row));
			} catch (error) {
				const GifReadSourcesError = new Error("Error reading Sources for Gif from database.", {cause: error});
				GifReadSourcesError.name = "GifReadSourcesError";
				GifReadSourcesError.status = 500;
				throw GifReadSourcesError;
			}
		})();
	}

	/**
	 * Update list of Sources for Gif in the database.
	 * @param {string[]} newSourcesList
	 * @returns {Promise} Successfully updated Sources in database.
	 * @throws {GifSourceCreateError} 500 An error occurred creating new Sources for the Gif in the database.
	 * @throws {GifSourceDeleteError} 500 An error occurred deleting removed Sources for the Gif from the database.
	 */
	set sources(newSourcesList) {
		(async () => {
			// Create new sources.
			const createSourceCalls = [];
			// Parse new sources list and find if any were added from the existing sources.
			for (const newSource of newSourcesList) {
				const found = (await this.sources).find(({source: existingSource}) => newSource === existingSource);
				// If not found, add make source calls to array.
				if (typeof found === "undefined") createSourceCalls.push(
					(new Source({source: newSource, fileUniqueId: this.fileUniqueId})).create()
				);
			}
			// Wait for array of database calls to complete.
			try {
				await Promise.all(createSourceCalls);
			} catch (error) {
				const GifSourceCreateError = new Error("Error creating Sources for Gif in database", {cause: error});
				GifSourceCreateError.name = "GifSourceCreateError";
				GifSourceCreateError.status = 500;
				throw GifSourceCreateError;
			}

			// Remove deleted sources.
			const deleteSourceCalls = [];
			// Parse existing sources and find if any were removed in the new sources list.
			for (const existingSource of (await this.sources)) {
				// If not found, add delete source calls to array.
				if (!newSourcesList.includes(existingSource.source)) deleteSourceCalls.push(existingSource.delete());
			}
			// Wait for array of database calls to complete.
			try {
				await Promise.all(deleteSourceCalls);
			} catch (error) {
				const GifSourceDeleteError = new Error("Error deleting Sources for Gif from database", {cause: error});
				GifSourceDeleteError.name = "GifSourceDeleteError";
				GifSourceDeleteError.status = 500;
				throw GifSourceDeleteError;
			}
		})();
	}

	/**
	 * Fetch the User who uploaded this Gif to the database.
	 * @returns {Promise<User>}
	 */
	get uploadedBy() {
		return (async () => {
			return await User.readById(this.uploadedById);
		})();
	}

	/**
	 * Fetch the User who approved this Gif in the database.
	 * @returns {Promise<User>}
	 */
	get approvedBy() {
		return (async () => {
			return await User.readById(this.approvedById);
		})();
	}
}

export default Gif;