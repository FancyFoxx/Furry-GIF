/**
 * Functions to manipulate User objects.
 *
 * @author Fancy Foxx <MrFancyFoxx@Gmail.com>
 */

import User from "../models/User.js";
import createError from "http-errors";

class UserController {
	/**
	 * Fetch a User from the database by the specified ID.
	 * @param userId - ID by which to fetch User.
	 * @returns {Promise<User|HttpError>} User object if found; else 404 HttpError.
	 */
	static async readById(userId) {
		const user = await User.readById(userId);
		if (!user) throw createError(404, "User not found.");
		return user;
	}

	/**
	 * Save a User in the database. If the user does not exist, create a new entry. Else, update the existing entry.
	 * @param {Object} properties - User properties.
	 * @param {number} properties.id - Unique identifier.
	 * @param {string} [properties.firstName] - User's first name.
	 * @param {string} [properties.lastName] - User's last name.
	 * @param {string} [properties.username] - User's username on Telegram.
	 * @param {string} [properties.role] - Permissions role.
	 * @param {boolean} [properties.disabled] - Disabled status of account.
	 * @param {boolean} [properties.sfwMode] - Content view mode.
	 * @returns {Promise<User>}
	 */
	static async save(properties) {
		// Check if user exists.
		let user = await User.readById(properties.id);
		if (user) {
			user.firstName = properties.firstName ?? user.firstName;
			user.lastName = properties.lastName ?? user.lastName;
			user.username = properties.username ?? user.username;
			user.role = properties.role ?? user.role;
			user.disabled = properties.disabled ?? user.disabled;
			user.sfwMode = properties.sfwMode ?? user.sfwMode;
			await user.update();
		// If an existing User is not found, create it.
		} else {
			user = new User(properties);
			await user.create();
		}
		return user;
	}

	/**
	 * Delete the provided Gif from the database. Only Users with the administrator role can issue deletions.
	 * @param {User} requester - User requesting to delete the specified User.
	 * @param {number} userId - Identifier of the User to be deleted.
	 * @returns {Promise<void>} - Successfully deleted User.
	 */
	static async delete(requester, userId) {
		if (requester.id === userId || ["administrator"].includes(requester.role)) {
			const user = await User.readById(userId);
			await user.delete();
			return;
		}
		throw createError(401, "Unauthorized. Users can only be deleted by themselves or administrators.");
	}
}

export default UserController;