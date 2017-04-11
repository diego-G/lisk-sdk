/*
 * Copyright © 2017 Lisk Foundation
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
 *
 */
/**
 * Multisignature module provides functions for creating multisignature group registration transactions, and signing transactions requiring multisignatures.
 * @class multisignature
 */

var crypto      = require('./crypto.js');
var constants   = require('../constants.js');
var slots       = require('../time/slots.js');

/**
 * @method createDapp
 * @param transaction
 * @param secret
 *
 * @return {string}
 */

function signTransaction (trs, secret) {
	var keys = crypto.getKeys(secret);
	var signature = crypto.multiSign(trs, keys);

	return {
		transactionId: trs.id,
		signature: signature
	};
}

/**
 * @method createMultisignature
 * @param secret
 * @param secondSecret
 * @param keysgroup
 * @param lifetime
 * @param min
 *
 * @return {Object}
 */

function createMultisignature (secret, secondSecret, keysgroup, lifetime, min) {
	var keys = crypto.getKeys(secret);

	var keygroupFees = keysgroup.length + 1;

	var transaction = {
		type: 4,
		amount: 0,
		fee: (constants.fees.multisignature * keygroupFees),
		recipientId: null,
		senderPublicKey: keys.publicKey,
		timestamp: slots.getTime(),
		asset: {
			multisignature: {
				min: min,
				lifetime: lifetime,
				keysgroup: keysgroup
			}
		}
	};

	crypto.sign(transaction, keys);

	if (secondSecret) {
		var secondKeys = crypto.getKeys(secondSecret);
		crypto.secondSign(transaction, secondKeys);
	}

	transaction.id = crypto.getId(transaction);
	return transaction;
}

/**
 * @method createTransaction
 * @param recipientId
 * @param amount
 * @param secret
 * @param secondSecret
 * @param requesterPublicKey
 *
 * @return {Object}
 */

function createTransaction (recipientId, amount, secret, secondSecret, requesterPublicKey) {
	var transaction = {
		type: 0,
		amount: amount,
		fee: constants.fees.send,
		recipientId: recipientId,
		timestamp: slots.getTime(),
		asset: {}
	};

	var keys = crypto.getKeys(secret);
	transaction.senderPublicKey = keys.publicKey;

	if (requesterPublicKey) {
		transaction.requesterPublicKey = requesterPublicKey;
	} else {
		transaction.requesterPublicKey = transaction.senderPublicKey;
	}

	crypto.sign(transaction, keys);

	if (secondSecret) {
		var secondKeys = crypto.getKeys(secondSecret);
		crypto.secondSign(transaction, secondKeys);
	}

	transaction.id = crypto.getId(transaction);
	transaction.signatures = [];
	return transaction;
}

module.exports = {
	signTransaction: signTransaction,
	createMultisignature: createMultisignature,
	createTransaction: createTransaction
};
