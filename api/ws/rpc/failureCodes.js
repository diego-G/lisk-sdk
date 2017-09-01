'use strict';

module.exports = {
	INVALID_HEADERS: 4100,
	INCOMPATIBLE_NONCE: 4101,
	INCOMPATIBLE_NETWORK: 4102,
	INCOMPATIBLE_VERSION: 4103,
	ALREADY_ADDED: 4104,
	ALREADY_REMOVED: 4105,
	DIFFERENT_CONN_ID: 4106,
	ON_MASTER: {
		UPDATE: {
			CHECK_PRESENCE: 4200,
			INVALID_PEER: 4201,
			TRANSPORT: 4202,
		},
		REMOVE: {
			NOT_ON_LIST: 4210,
			FROZEN_PEER: 4211
		},
		INSERT: {
			INSERT_ONLY_FAILURE: 4230,
			NOT_ACCEPTED: 4231,
			NONCE_EXISTS: 4232,
		}
	}
};

module.exports.errorMessages = {
	4100: 'Invalid headers',
	4101: 'Request is made by itself',
	4102: 'Request is made on the wrong network',
	4103: 'Request is made from incompatible version',
	4104: 'Attempting to insert an already active peer',
	4105: 'Attempting to remove a non-existent peer',
	4106: 'Attempting to change peer data from different connection',
	4200: 'Failed to check if peer is already present',
	4201: 'Unable to match an address to the peer',
	4202: 'Transport error while invoking update procedure',
	4210: 'Peer is not on a peers list',
	4211: 'Attempting to remove a frozen peer',
	4230: 'Insert only update failed - peer is on a list',
	4231: 'Cannot accept a peer - private ip address or itself',
	4232: 'Attempting to insert a peer with nonce that is on a list already',
};

/**
 * @param {number} code
 * @param {string} message
 * @param {string}[description=undefined] description
 * @constructor
 */
function PeerUpdateError (code, message, description) {
	this.code = code;
	this.message = message;
	this.description = description;
}

PeerUpdateError.prototype.toString = function () {
	return JSON.stringify({code: this.code, message: this.message, description: this.description});
};

PeerUpdateError.prototype = Error.prototype;

module.exports.PeerUpdateError = PeerUpdateError;
