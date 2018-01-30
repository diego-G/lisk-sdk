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

/**
 * ConnectionsTable - stores connection (socket) ids and matches them with peer's nonces.
 *
 * @class
 * @memberof api/ws.workers
 */
function ConnectionsTable () {
	this.connectionIdToNonceMap = {};
	this.nonceToConnectionIdMap = {};
}

/**
 * Description.
 *
 * @param {string} connectionId - Description
 * @returns {string|undefined} returns matching nonce if an entry was added previously
 * @todo: Add description of the function and its parameters
 */
ConnectionsTable.prototype.getNonce = function (connectionId) {
	return this.connectionIdToNonceMap[connectionId];
};

/**
 * Description.
 *
 * @param {string} nonce - Description
 * @returns {string|undefined} returns matching connectionId if an entry was added previously
 * @todo: Add description of the function and its parameters
 */
ConnectionsTable.prototype.getConnectionId = function (nonce) {
	return this.nonceToConnectionIdMap[nonce];
};

/**
 * Links peer via nonce with given connectionId.
 *
 * @param {string} nonce - Description
 * @param {string} connectionId - Description
 * @todo: Add descriptions of the parameters
 */
ConnectionsTable.prototype.add = function (nonce, connectionId) {

	if (!nonce) {
		throw new Error('Cannot add connection table entry without nonce');
	}
	if (!connectionId) {
		throw new Error('Cannot add connection table entry without connectionId');
	}

	this.connectionIdToNonceMap[connectionId] = nonce;
	this.nonceToConnectionIdMap[nonce] = connectionId;
};

/**
 * Removes a peer with assigned connectionId.
 *
 * @param {string} nonce - Description
 * @todo: Add description of the parameter
 */
ConnectionsTable.prototype.remove = function (nonce) {
	if (!nonce) {
		throw new Error('Cannot remove connection table entry without nonce');
	}
	var connectionId = this.getConnectionId(nonce);
	this.nonceToConnectionIdMap[nonce] = null;
	delete this.nonceToConnectionIdMap[nonce];
	this.connectionIdToNonceMap[connectionId] = null;
	delete this.connectionIdToNonceMap[connectionId];
};

module.exports = new ConnectionsTable();
