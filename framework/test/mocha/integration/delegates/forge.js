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

const util = require('util');
const { transfer } = require('@liskhq/lisk-transactions');
const application = require('../../common/application');
const Bignum = require('../../../../src/modules/chain/helpers/bignum');
const random = require('../../common/utils/random');
const accountFixtures = require('../../fixtures/accounts');

const genesisBlock = __testContext.config.genesisBlock;
const { NORMALIZER } = global.__testContext.config;

const localCommon = require('../common');

const addTransactionsAndForge = util.promisify(
	localCommon.addTransactionsAndForge
);
const transactionInPool = localCommon.transactionInPool;
const addTransaction = util.promisify(localCommon.addTransaction);
const fillPool = util.promisify(localCommon.fillPool);
const forge = util.promisify(localCommon.forge);

let library;

describe('delegates (forge)', () => {
	before(done => {
		application.init(
			{
				sandbox: {
					name: 'lisk_test_delegates_forge',
				},
			},
			(err, scope) => {
				library = scope;
				library.modules.blocks.lastBlock.set(genesisBlock);
				done();
			}
		);
	});

	after(done => {
		application.cleanup(done);
	});

	function createDebitTransaction(account, amount) {
		return transfer({
			amount: new Bignum(NORMALIZER).multipliedBy(amount).toString(),
			recipientId: random.account().address,
			passphrase: account.passphrase,
		});
	}

	function createCreditTransaction(account, amount) {
		return transfer({
			amount: new Bignum(NORMALIZER).multipliedBy(amount).toString(),
			recipientId: account.address,
			passphrase: accountFixtures.genesis.passphrase,
		});
	}

	describe('forge', () => {
		describe('total spending', () => {
			describe('should not include transactions which exceed total spending per account balance', () => {
				it('when we debit the account first', async () => {
					// Credit the account with 1 LSK and forge a block
					const account = random.account();
					const transaction = createCreditTransaction(account, 1);
					await addTransactionsAndForge(library, [transaction], 0);

					// Create credit and debit transactions
					const credit03 = createCreditTransaction(account, 0.3);
					const debit06 = createDebitTransaction(account, 0.6);
					const debit04 = createDebitTransaction(account, 0.4);
					const debit01 = createDebitTransaction(account, 0.1);

					// Add transactions to the transaction pool
					await addTransaction(library, debit06); // Account balance after: 0.3 LSK
					await addTransaction(library, debit04); // Account balance after: -0.2 LSK (invalid transaction)
					await addTransaction(library, credit03); // Account balance after: 0.3 LSK
					await addTransaction(library, debit01); // Account balance after: 0.1 LSK

					// Forge a block
					await fillPool(library);
					await forge(library);

					// Get the last forged block
					const transactionsInLastBlock = library.modules.blocks.lastBlock
						.get()
						.transactions.map(t => t.id);

					// Last block should contain only 3 transactions
					// The smallest first as we sort transactions by amount while forging
					expect(transactionsInLastBlock)
						.to
						.eql([debit01.id, credit03.id, debit06.id]);

					// Un-applied transaction must be deleted from the pool
					expect(transactionInPool(library, debit04.id)).to.be.false;
				});

				it('when we credit the account first', async () => {
					// Credit the account with 1 LSK and forge a block
					const account = random.account();
					const transaction = createCreditTransaction(account, 1);
					await addTransactionsAndForge(library, [transaction], 0);

					// Create credit and debit transactions
					const credit03 = createCreditTransaction(account, 0.3);
					const debit06 = createDebitTransaction(account, 0.6);
					const debit04 = createDebitTransaction(account, 0.4);
					const debit01 = createDebitTransaction(account, 0.1);

					// Add transactions to the transaction pool
					await addTransaction(library, credit03); // Account balance after: 1 LSK
					await addTransaction(library, debit06); // Account balance after: 0.3 LSK
					await addTransaction(library, debit04); // Account balance after: -0.2 LSK (invalid transaction)
					await addTransaction(library, debit01); // Account balance after: 0.1 LSK

					// Forge a block
					await fillPool(library);
					await forge(library);

					// Get the last forged block
					const transactionsInLastBlock = library.modules.blocks.lastBlock
						.get()
						.transactions.map(t => t.id);

					// Last block should contain only 3 transactions
					// The smallest first as we sort transactions by amount while forging
					expect(transactionsInLastBlock)
						.to
						.eql([debit01.id, credit03.id, debit06.id]);

					// Un-applied transaction must be deleted from the pool
					expect(transactionInPool(library, debit04.id)).to.be.false;
				});

				it('when we try to spend entire balance and transaction fee makes balance to go negative', async () => {
					// Credit the account with 1 LSK and forge a block
					const account = random.account();
					const transaction = createCreditTransaction(account, 1);
					await addTransactionsAndForge(library, [transaction], 0);

					// Create credit and debit transactions
					const credit03 = createCreditTransaction(account, 0.3);
					const debit06 = createDebitTransaction(account, 0.6);
					const debit04 = createDebitTransaction(account, 0.4);
					const debit01 = createDebitTransaction(account, 0.1);
					const debit01a = createDebitTransaction(account, 0.1);

					// Add transactions to the transaction pool
					await addTransaction(library, credit03); // Account balance after: 1 LSK
					await addTransaction(library, debit06); // Account balance after: 0.3 LSK
					await addTransaction(library, debit04); // Account balance after: 0.3 LSK
					await addTransaction(library, debit01); // Account balance after: 0.3 LSK
					await addTransaction(library, debit01a); // Account balance after: -0.1 LSK (invalid transaction)

					// Forge a block
					await fillPool(library);
					await forge(library);

					// Get the last forged block
					const transactionsInLastBlock = library.modules.blocks.lastBlock
						.get()
						.transactions.map(t => t.id);

					// Last block should contain only 3 transactions
					// The smallest first as we sort transactions by amount while forging
					expect(transactionsInLastBlock)
						.to
						.eql([debit01.id, credit03.id, debit06.id]);

					// Un-applied transaction must be deleted from the pool
					expect(transactionInPool(library, debit04.id)).to.be.false;
					expect(transactionInPool(library, debit01a.id)).to.be.false;
				});

				it('when we credit the account first, overspend last', async () => {
					// Credit the account with 1 LSK and forge a block
					const account = random.account();
					const transaction = createCreditTransaction(account, 1);
					await addTransactionsAndForge(library, [transaction], 0);

					// Create credit and debit transactions
					const credit03 = createCreditTransaction(account, 0.3);
					const debit06 = createDebitTransaction(account, 0.6);
					const debit04 = createDebitTransaction(account, 0.4);
					const debit01 = createDebitTransaction(account, 0.1);
					const debit03 = createDebitTransaction(account, 0.3);

					// Add transactions to the transaction pool
					await addTransaction(library, credit03); // Account balance after: 1 LSK
					await addTransaction(library, debit03); // Account balance after: 0.6 LSK
					await addTransaction(library, debit01); // Account balance after: 0.2 LSK
					await addTransaction(library, debit04); // Account balance after: -0.3 (invalid transaction)
					await addTransaction(library, debit06); // Account balance after: -1 LSK (invalid transaction)

					// Forge a block
					await fillPool(library);
					await forge(library);

					// Get the last forged block
					const transactionsInLastBlock = library.modules.blocks.lastBlock
						.get()
						.transactions.map(t => t.id);

					// Last block should contain only 3 transactions
					// The smallest first as we sort transactions by amount while forging
					expect(transactionsInLastBlock).to.eql([
						debit01.id,
						debit03.id,
						credit03.id,
					]);

					// Un-applied transaction must be deleted from the pool
					expect(transactionInPool(library, debit04.id)).to.be.false;
					expect(transactionInPool(library, debit06.id)).to.be.false;
				});
			});
		});
	});
});
