/**
 * Models the User table in database.
 *
 * @author Fancy Foxx <MrFancyFoxx@Gmail.com>
 */

import DB from "./DB.js";

/**
 * A User utilizes the library of Gifs.
 * @class
 */
class User {
	/**
	 * Unique identifier for the given user on Telegram.
	 * @instance
	 * @type {number}
	 */
	id;
	/**
	 * User's first name.
	 * @instance
	 * @type {string}
	 */
	firstName;
	/**
	 * Optional. User's last name.
	 * @instance
	 * @type {string}
	 */
	lastName;
	/**
	 * Optional. User's username on Telegram.
	 * @instance
	 * @type {string}
	 */
	username;
	/**
	 * Permissions role. Can be "user", "moderator", or "administrator".
	 * @instance
	 * @type {string}
	 */
	role;
	/**
	 * Disabled status of account.
	 * @instance
	 * @type {boolean}
	 */
	disabled;
	/**
	 * Content view mode.
	 * @instance
	 * @type {boolean}
	 */
	sfwMode;
	/**
	 * Date web account was created.
	 * @instance
	 * @type {Date}
	 */
	createdAt;
	/**
	 * Date web account was last updated.
	 * @instance
	 * @type {Date}
	 */
	updatedAt;

	/**
	 * Fetch specific User from the database identified by its id.
	 * @param {number} id - ID by which to fetch User.
	 * @returns {Promise<User|null>} User object if found; else null.
	 * @throws {UserCreateError} 500 An error occurred reading the User from the database.
	 */
	static async readById(id) {
		try {
			const sql = "SELECT * FROM User WHERE id = ?";
			const resultSet = await DB.getData(sql, [id]);
			if (!resultSet.rows.length) return null;
			return new User(resultSet.rows[0]);
		} catch (error) {
			const UserCreateError = new Error("Error reading User from database.", {cause: error});
			UserCreateError.name = "UserCreateError";
			UserCreateError.status = 500;
			throw UserCreateError;
		}
	}

	/**
	 * Creates a User object.
	 * @param {Object} properties - Initialization properties for the User.
	 * @param {number} properties.id - Unique identifier.
	 * @param {string} properties.firstName - User's first name.
	 * @param {string} [properties.lastName] - User's last name.
	 * @param {string} [properties.username] - User's username on Telegram.
	 * @param {string} [properties.role="user"] - Permissions role.
	 * @param {boolean} [properties.disabled=false] - Disabled status of account.
	 * @param {boolean} [properties.sfwMode=true] - Content view mode.
	 * @param {Date} [properties.createdAt] - Date web account was created.
	 * @param {Date} [properties.updatedAt] - Date web account was last updated.
	 */
	constructor(properties) {
		this.id = properties.id;
		this.firstName = properties.firstName;
		this.lastName = properties.lastName ?? null;
		this.username = properties.username ?? null;
		this.role = properties.role ?? "user";
		this.disabled = Boolean(properties.disabled) ?? false;
		this.sfwMode = Boolean(properties.sfwMode) ?? true;
		this.createdAt = properties.createdAt ?? null;
		this.updatedAt = properties.updatedAt ?? null;
	}

	/**
	 * Create a User entry in the database.
	 * @returns {Promise} Successful database insertion.
	 * @throws {UserCreateError} 500 An error occurred inserting the User in the database.
	 */
	async create() {
		try {
			const sql = `INSERT INTO User(
				id,
				firstName,
				lastName,
				username,
				role,
			 	disabled,
                sfwMode
                )
				VALUES (?, ?, ?, ?, ?, ?, ?)`;
			await DB.setData(sql,
				[
					this.id,
					this.firstName,
					this.lastName,
					this.username,
					this.role,
					this.disabled,
					this.sfwMode
				]
			);
		} catch (error) {
			const UserCreateError = new Error("Error inserting User in database.", {cause: error});
			UserCreateError.name = "UserCreateError";
			UserCreateError.status = 500;
			throw UserCreateError;
		}
	}

	/**
	 * Update a User entry in the database. Only firstName, lastName, username, role, disabled, and sfwMode fields are
	 * modified.
	 * @returns {Promise} Successful database update.
	 * @throws {UserUpdateError} 500 An error occurred updating the User in the database.
	 */
	async update() {
		try {
			const sql = `UPDATE User
						SET firstName = ?, lastName = ?, username = ?, role = ?, disabled = ?, sfwMode = ?, updatedAt = ?
						WHERE id = ?`;
			await DB.setData(
				sql,
				[this.firstName, this.lastName, this.username, this.role, this.disabled, this.sfwMode, (new Date()), this.id]
			);
		} catch (error) {
			const UserUpdateError = new Error("Error updating User in database.", {cause: error});
			UserUpdateError.name = "UserUpdateError";
			UserUpdateError.status = 500;
			throw UserUpdateError;
		}
	}

	/**
	 * Delete a User entry from the database.
	 * @returns {Promise} Successful database deletion.
	 * @throws {UserDeleteError} 500 An error occurred deleting the User from the database.
	 */
	async delete() {
		try {
			const sql = `DELETE FROM User WHERE id = ?`;
			await DB.setData(sql, [this.id]);
		} catch (error) {
			const UserDeleteError = new Error("Error deleting User from database.", {cause: error});
			UserDeleteError.name = "UserDeleteError";
			UserDeleteError.status = 500;
			throw UserDeleteError;
		}
	}
}

export default User;