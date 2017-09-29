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
 * Transfer module provides functions for creating "in" transfer transactions (balance transfers to
 * an individual dapp account).
 * @class transfer
 */
import cryptoModule from '../crypto';
import { inTransferFee } from '../constants';
import slots from '../time/slots';
import { prepareTransaction } from './utils';

/**
 * @method createInTransfer
 * @param dappId
 * @param amount
 * @param secret
 * @param secondSecret
 * @param timeOffset
 *
 * @return {Object}
 */

export default function createInTransfer(dappId, amount, secret, secondSecret, timeOffset) {
	const keys = cryptoModule.getKeys(secret);

	const transaction = {
		type: 6,
		amount,
		fee: inTransferFee,
		recipientId: null,
		senderPublicKey: keys.publicKey,
		timestamp: slots.getTimeWithOffset(timeOffset),
		asset: {
			inTransfer: {
				dappId,
			},
		},
	};

	return prepareTransaction(transaction, secret, secondSecret);
}
