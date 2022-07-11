/**
 * Application helper functions.
 *
 * @author Fancy Foxx <MrFancyFoxx@Gmail.com>
 */

export default Object.freeze({
	/**
	 * Convert the provided string from snake_case to camelCase.
	 * @param string - String in snake_case format.
	 * @returns {string} - New string in camelCase format.
	 */
	snakeToCamelCase: function(string) {
		return string.toLowerCase().replace(/_[a-z]/g, (group) => group.slice(-1).toUpperCase());
	}
});


