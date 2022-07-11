/**
 * Models the Tag table in database.
 *
 * @author Fancy Foxx <MrFancyFoxx@Gmail.com>
 */

import DB from "./DB.js";

/**
 * Tags are keywords used to describe GIFs based on their content. Tags are used to search GIFs.
 * @class
 */
class Tag {
	/**
	 * Tag name.
	 * @instance
	 * @type {string}
	 */
	tag;
	/**
	 * Tag category. Can be "artist", "character", "copyright", "general", "meta", "species"
	 * @instance
	 * @type {string}
	 */
	category;

	/**
	 * Fetch specific Tag from the database identified by its name. If an alias name is provided, the Tag it references
	 * is returned.
	 * @param {string} tagName - Name by which to fetch Tag.
	 * @returns {Promise<Tag|null>} Tag object if found; else null.
	 * @throws {TagCreateError} 500 An error occurred reading the Tag from the database.
	 */
	static async readByTagName(tagName) {
		try {
			// Search TagAlias table, first.
			const aliasSql = "SELECT Tag.tag, category FROM TagAlias JOIN Tag ON TagAlias.tag = Tag.tag WHERE alias = ?";
			const aliasResultSet = await DB.getData(aliasSql, [tagName]);
			if (aliasResultSet.rows.length) return new Tag(aliasResultSet.rows[0]);
			// If no alias was found, search Tag table.
			const tagSql = "SELECT tag, category FROM Tag WHERE tag = ?";
			const tagResultSet = await DB.getData(tagSql, [tagName]);
			if (!tagResultSet.rows.length) return null;
			return new Tag(tagResultSet.rows[0]);
		} catch (error) {
			const TagCreateError = new Error("Error reading Tag from database.", {cause: error});
			TagCreateError.name = "TagCreateError";
			TagCreateError.status = 500;
			throw TagCreateError;
		}
	}

	/**
	 * Fetch Tags from the database identified by the provided query data.
	 * @param {string} query
	 * @returns {Promise<Tag[]>}
	 * @throws {TagReadError} 500 An error occurred reading Tags from the database.
	 */
	static async search(query = "") {
		let sql = "SELECT tag FROM tag";
		const values = [];
		if (query.length) {
			sql += " WHERE tag LIKE ?";
			values.push(`%${query}%`);
		}

		try {
			const resultSet = await DB.getData(sql, values);
			return resultSet.rows.map(tag => new Tag(tag));
		} catch (error) {
			const TagReadError = new Error("Error reading Tags from database.", {cause: error});
			TagReadError.name = "TagReadError";
			TagReadError.status = 500;
			throw TagReadError;
		}
	}

	/**
	 * Creates a Tag object.
	 * @param {Object} properties - Initialization properties for the Source.
	 * @param {string} properties.tag - Tag name.
	 * @param {string} [properties.category="general"] - Tag category.
	 */
	constructor(properties) {
		this.tag = properties.tag;
		this.category = properties.category || "general";
	}

	/**
	 * Create a Tag entry in the database.
	 * @returns {Promise} Successful database insertion.
	 * @throws {TagCreateError} 500 An error occurred inserting the Tag in the database.
	 */
	async create() {
		try {
			const sql = `INSERT INTO Tag(tag, category) VALUES (?, ?)`;
			await DB.setData(sql, [this.tag, this.category]);
		} catch (error) {
			const TagCreateError = new Error("Error inserting Tag in database.", {cause: error});
			TagCreateError.name = "TagCreateError";
			TagCreateError.status = 500;
			throw TagCreateError;
		}
	}

	/**
	 * Update a Tag entry in the database. Only the category field is modified.
	 * @returns {Promise} Successful database update.
	 * @throws {TagUpdateError} 500 An error occurred updating the Tag in the database.
	 */
	async update() {
		try {
			const sql = `UPDATE Tag SET category = ? WHERE tag = ?`;
			await DB.setData(sql, [this.category, this.tag]);
		} catch (error) {
			const TagUpdateError = new Error("Error updating Tag in database.", {cause: error});
			TagUpdateError.name = "TagUpdateError";
			TagUpdateError.status = 500;
			throw TagUpdateError;
		}
	}

	/**
	 * Delete a Tag entry from the database.
	 * @returns {Promise} Successful database deletion.
	 * @throws {TagDeleteError} 500 An error occurred deleting the Tag from the database.
	 */
	async delete() {
		try {
			const sql = `DELETE FROM Tag WHERE tag = ?`;
			await DB.setData(sql, [this.tag]);
		} catch (error) {
			const TagDeleteError = new Error("Error deleting Tag from database.", {cause: error});
			TagDeleteError.name = "TagDeleteError";
			TagDeleteError.status = 500;
			throw TagDeleteError;
		}
	}

	/**
	 * Read all Aliases for this Tag from the database.
	 * @returns {Promise<string[]>}
	 * @throws {TagReadAliasesError} 500 An error occurred reading Aliases for the Tag from the database.
	 */
	get aliases() {
		return (async () => {
			const sql = "SELECT alias FROM TagAlias WHERE tag = ?";
			try {
				const resultSet = await DB.getData(sql, [this.tag]);
				return resultSet.rows.map(row => row.alias);
			} catch (error) {
				const TagReadAliasesError = new Error("Error reading Aliases for Tag from database.", {cause: error});
				TagReadAliasesError.name = "TagReadAliasesError";
				TagReadAliasesError.status = 500;
				throw TagReadAliasesError;
			}
		})();
	}

	/**
	 * Update list of Aliases for Tag in the database.
	 * @param {string[]} newAliasesList
	 * @returns {Promise} Successfully updated Tags in database.
	 * @throws {TagAliasCreateError} 500 An error occurred adding Aliases to the Tag in the database.
	 * @throws {TagAliasDeleteError} 500 An error occurred deleting removed Aliases for the Tag from the database.	 */
	set aliases(newAliasesList) {
		(async () => {
			// Add new aliases.
			const addAliasCalls = [];
			const addAliasesSql = "INSERT INTO TagAlias (tag, alias) VALUES (?, ?)";
			// Parse new aliases list and find if any were added from the existing aliases.
			for (const newAlias of newAliasesList) {
				// If not found, add create alias calls to array.
				if (!(await this.aliases).includes(newAlias)) addAliasCalls.push(DB.setData(addAliasesSql, [this.tag, newAlias]));
			}
			// Wait for array of database calls to complete.
			try {
				await Promise.all(addAliasCalls);
			} catch (error) {
				const TagAliasCreateError = new Error("Error adding Aliases to Tag in database", {cause: error});
				TagAliasCreateError.name = "TagAliasCreateError";
				TagAliasCreateError.status = 500;
				throw TagAliasCreateError;
			}

			// Remove deleted aliases.
			const deleteAliasCalls = [];
			const deleteAliasesSql = "DELETE FROM TagAlias WHERE tag = ? AND alias = ?";
			// Parse existing aliases and find if any were removed in the new aliases list.
			for (const existingAlias of (await this.aliases)) {
				// If not found, add delete alias calls to array.
				if (!newAliasesList.includes(existingAlias)) deleteAliasCalls.push(DB.setData(deleteAliasesSql, [this.tag, existingAlias]));
			}
			// Wait for array of database calls to complete.
			try {
				await Promise.all(deleteAliasCalls);
			} catch (error) {
				const TagAliasDeleteError = new Error("Error deleting Aliases for Tag from database", {cause: error});
				TagAliasDeleteError.name = "TagAliasDeleteError";
				TagAliasDeleteError.status = 500;
				throw TagAliasDeleteError;
			}
		})();
	}
}

export default Tag;