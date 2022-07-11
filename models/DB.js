/**
 * MySQL database connection wrapper.
 *
 * @author Fancy Foxx <MrFancyFoxx@Gmail.com>
 */

import mysql from "mysql2";

class DB {
	/**
	 * Database connection pool.
	 * @static
	 * @type {Pool}
	 */
	#pool;

	/**
	 * Establishes connection to the database and creates a connection pool.
	 */
	constructor() {
		this.#pool = mysql.createPool({
			host: process.env.DB_HOST,
			user: process.env.DB_USER,
			password: process.env.DB_PASSWORD,
			database: process.env.DB_DATABASE,
			charset: "utf8mb4_unicode_ci",
			supportBigNumbers: true,
			typeCast: (field, useDefaultTypeCasting) => {
				// We only want to cast bit fields that have a single-bit in them. If the field
				// has more than one bit, then we cannot assume it is supposed to be a Boolean.
				if ((field.type === "BIT") && (field.length === 1)) {
					const bytes = field.buffer();

					// A Buffer in Node represents a collection of 8-bit unsigned integers.
					// Therefore, our single "bit field" comes back as the bits '0000 0001',
					// which is equivalent to the number 1.
					return (bytes[0] === 1);
				}
				return useDefaultTypeCasting();
			}
		});
	}

	/**
	 * Query the database
	 * @param {string} sql - Prepared statement to execute.
	 * @param {any[]} values - Values to be parsed into the prepared statement, if any.
	 * @returns {Promise} Fields and values from executed query.
	 */
	getData(sql, values) {
		return new Promise((resolve, reject) => {
			this.#pool.query(sql, values, (queryError, results, fields) => {
				if (queryError) {
					const QueryError = new Error(
						`Error querying the database. ${queryError.code}: ${queryError.sqlMessage}`,
						{cause: queryError}
					);
					QueryError.name = "QueryError";
					QueryError.code = queryError.errorno;
					reject(QueryError);
				}

				// Information provided from query
				resolve({
					fields: fields,
					rows: results
				});
			});
		});
	}

	/**
	 * Update the database
	 * @param {string} sql - Prepared statement to execute.
	 * @param {any[]} values - Values to be parsed into the prepared statement, if any.
	 * @returns {Promise} Results from executed query.
	 */
	setData(sql, values) {
		return new Promise((resolve, reject) => {
			this.#pool.query(sql, values, (updateError, results) => {
				if (updateError) {
					const UpdateError = new Error(
						`Error updating the database. ${updateError.code}: ${updateError.sqlMessage} SQL: ${sql}. Values: ${values.join(", ")}.`,
						{cause: updateError}
					);
					UpdateError.name = "UpdateError";
					UpdateError.code = updateError.code;
					reject(UpdateError);
				}

				resolve(results);
			});
		});
	}
}

export default new DB();