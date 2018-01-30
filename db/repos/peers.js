/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';

const sql = require('../sql').peers;

const cs = {}; // Reusable ColumnSet objects

/**
 * Peers database interaction module
 * @memberof module:peers
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {PeersRepository}
 */
class PeersRepository {
	constructor(db, pgp) {
		this.db = db;
		this.pgp = pgp;

		if (!cs.insert) {
			cs.insert = new pgp.helpers.ColumnSet([
				'ip', 'wsPort', 'state', 'height', 'os', 'version', 'clock',
				{
					name: 'broadhash', init: c => c.value ? Buffer.from(c.value, 'hex') : null
				}
			], { table: 'peers' });
		}
	}

	/**
	 * Gets all peers from database
	 * @return {Promise<[]>}
	 */
	list() {
		return this.db.any(sql.list);
	}

	/**
	 * Clears all peers from database
	 * @return {Promise<null>}
	 */
	clear() {
		return this.db.none(sql.clear);
	}

	/**
	 * Inserts a new peer into database
	 *
	 * @param {Array<Object>} peers - Array of peer objects to be inserted.
	 * @return {Promise<null>}
	 */
	insert(peers) {
		return this.db.none(this.pgp.helpers.insert(peers, cs.insert));
	}
}

module.exports = PeersRepository;
