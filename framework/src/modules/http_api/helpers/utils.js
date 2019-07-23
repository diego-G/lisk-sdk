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
 */

'use strict';

const Bignumber = require('bignumber.js');

// TODO: This file will be renamed or deleted after deciding where calculateApproval belongs

// TODO: Move this method to better directory structure, as its not directly related to HTTP
function calculateApproval(votersBalance, totalSupply) {
	// votersBalance and totalSupply are sent as strings,
	// we convert them into bignum and send the response as number as well
	const votersBalanceBignum = new Bignumber(votersBalance || 0);
	const totalSupplyBignum = new Bignumber(totalSupply);
	const approvalBignum = votersBalanceBignum
		.dividedBy(totalSupplyBignum)
		.multipliedBy(100)
		.decimalPlaces(2);

	return !approvalBignum.isNaN() ? approvalBignum.toNumber() : 0;
}

module.exports = {
	calculateApproval,
};
