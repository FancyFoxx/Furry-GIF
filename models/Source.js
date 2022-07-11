/**
 * Models the Source table in database.
 *
 * @author Fancy Foxx <MrFancyFoxx@Gmail.com>
 */

import DB from "./DB.js";

class Source {

	/**
	 * Source URL.
	 * @instance
	 * @type {string}
	 */
	source;
	/**
	 * Unique identifier for the associated Gif.
	 * @instance
	 * @type {string}
	 */
	fileUniqueId;

	/**
	 * Creates a Source object.
	 * @param {Object} properties - Initialization properties for the Source.
	 * @param {string} properties.source - Source URL.
	 * @param {string} properties.fileUniqueId - Unique identifier for the associated Gif.
	 */
	constructor(properties) {
		this.source = properties.source;
		this.fileUniqueId = properties.fileUniqueId;
	}

	/**
	 * Create a Source entry in the database.
	 * @returns {Promise} Successful database insertion.
	 * @throws {SourceCreateError} 500 An error occurred inserting the Source in the database.
	 */
	async create() {
		try {
			const sql = "INSERT INTO Source(source, fileUniqueId) VALUES (?, ?)";
			await DB.setData(sql, [this.source, this.fileUniqueId]);
		} catch (error) {
			const SourceCreateError = new Error("Error inserting Source in database.", {cause: error});
			SourceCreateError.name = "SourceCreateError";
			SourceCreateError.status = 500;
			throw SourceCreateError;
		}
	}

	/**
	 * Delete a Source entry from the database.
	 * @returns {Promise} Successful database deletion.
	 * @throws {SourceDeleteError} 500 An error occurred deleting the Source from the database.
	 */
	async delete() {
		try {
			const sql = `DELETE FROM Source WHERE source = ? AND fileUniqueId = ?`;
			await DB.setData(sql, [this.source, this.fileUniqueId]);
		} catch (error) {
			const SourceDeleteError = new Error("Error deleting Source from database.", {cause: error});
			SourceDeleteError.name = "SourceDeleteError";
			SourceDeleteError.status = 500;
			throw SourceDeleteError;
		}
	}
}

export default Source;