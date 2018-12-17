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
 *
 */
import BigNum from 'browserify-bignum';
import { TransactionError } from '../errors';
import { Account } from '../transaction_types';
import { convertBeddowsToLSK } from './';

interface VerifyBalanceReturn {
	readonly verified: boolean;
	readonly error?: TransactionError;
}

export const verifyBalance = (
	sender: Account,
	amount: BigNum,
): VerifyBalanceReturn => {
	const exceeded = new BigNum(sender.balance).lt(new BigNum(amount));

	return {
		verified: !exceeded,
		error: exceeded
			? new TransactionError(
					`Account does not have enough LSK: ${
						sender.address
					} balance: ${convertBeddowsToLSK(sender.balance.toString())}`,
			  )
			: undefined,
	};
};
