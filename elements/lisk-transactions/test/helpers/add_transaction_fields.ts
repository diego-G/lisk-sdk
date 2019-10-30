/*
 * Copyright © 2019 Lisk Foundation
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
export const addTransactionFields = (transaction: any) => {
	return {
		...transaction,
		blockId: '13115894772963772254',
		confirmations: 123,
		height: 2,
		relays: undefined,
		signSignature: transaction.signSignature
			? transaction.signSignature
			: undefined,
		receivedAt: new Date().toISOString(),
		signatures: transaction.signatures ? [...transaction.signatures] : [],
	};
};
