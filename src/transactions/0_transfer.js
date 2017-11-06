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
import cryptoModule from '../crypto';
import { TRANSFER_FEE, DATA_FEE } from '../constants';
import {
	prepareTransaction,
	getAddressAndPublicKeyFromRecipientData,
	getTimeWithOffset,
} from './utils';

/**
 * @method transfer
 * @param {Object} Object - Object
 * @param {String} Object.recipientId
 * @param {String} Object.recipientPublicKey
 * @param {String} Object.amount
 * @param {String} Object.secret
 * @param {String} Object.secondSecret
 * @param {String} Object.data
 * @param {Number} Object.timeOffset
 *
 * @return {Object}
 */

export default function transfer({
	recipientId,
	recipientPublicKey,
	amount,
	secret,
	secondSecret,
	data,
	timeOffset,
}) {
	const { address, publicKey } = getAddressAndPublicKeyFromRecipientData({
		recipientId,
		recipientPublicKey,
	});
	const keys = cryptoModule.getKeys(secret);
	const fee = data ? TRANSFER_FEE + DATA_FEE : TRANSFER_FEE;
	const transaction = {
		type: 0,
		amount: amount.toString(),
		fee: fee.toString(),
		recipientId: address,
		recipientPublicKey: publicKey,
		senderPublicKey: keys.publicKey,
		timestamp: getTimeWithOffset(timeOffset),
		asset: {},
	};

	if (data && data.length > 0) {
		if (data !== data.toString('utf8'))
			throw new Error(
				'Invalid encoding in transaction data. Data must be utf-8 encoded.',
			);
		transaction.asset.data = data;
	}

	return prepareTransaction(transaction, secret, secondSecret);
}
