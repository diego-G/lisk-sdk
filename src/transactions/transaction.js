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
 * Transaction module provides functions for creating balance transfer transactions.
 * @class transaction
 */

const crypto = require('./crypto');
const constants = require('../constants');
const slots = require('../time/slots');
const { prepareTransaction } = require('./utils');

/**
 * @method createTransaction
 * @param recipientId
 * @param amount
 * @param secret
 * @param secondSecret
 * @param data
 * @param timeOffset
 *
 * @return {Object}
 */

function createTransaction(recipientId, amount, secret, secondSecret, data, timeOffset) {
	const keys = crypto.getKeys(secret);
	const transaction = {
		type: 0,
		amount,
		fee: constants.fees.send,
		recipientId,
		senderPublicKey: keys.publicKey,
		timestamp: slots.getTimeWithOffset(timeOffset),
		asset: {},
		data,
	};

	return prepareTransaction(transaction, keys, secondSecret);
}

module.exports = {
	createTransaction,
};
