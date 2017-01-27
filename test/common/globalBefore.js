'use strict';

/**
 * @param {string} table
 * @param {Logger} logger
 * @param {Object} db
 * @param {Function} cb
 */
function clearDatabaseTable (db, logger, table, cb) {
	db.query('DELETE FROM ' + table).then(function (result) {
		cb(null, result);
	}).catch(function (err) {
		logger.err('Failed to clear database table: ' + table);
		throw err;
	});
}

module.exports = {
	clearDatabaseTable: clearDatabaseTable
};
