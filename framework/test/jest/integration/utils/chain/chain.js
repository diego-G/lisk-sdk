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

'use strict';

const { genesisConfig } = require('../configs');
const { defaultTransactions } = require('../default_transactions');
const { createMockChannel } = require('../channel');
const ChainModule = require('../../../../../src/modules/chain');
const genesisBlock = require('../../../../fixtures/config/devnet/genesis_block');

const createDefaultChainModule = () => {
	const options = {
		...ChainModule.defaults.default,
		constants: genesisConfig(),
		genesisBlock,
		registeredTransactions: defaultTransactions(),
	};
	const chainModule = new ChainModule(options);

	return chainModule;
};

const createDefaultLoadedChainModule = async databaseName => {
	const chainModule = createDefaultChainModule();
	await chainModule.load(createMockChannel(databaseName));
	return chainModule.chain;
};

module.exports = {
	createDefaultChainModule,
	createDefaultLoadedChainModule,
};
