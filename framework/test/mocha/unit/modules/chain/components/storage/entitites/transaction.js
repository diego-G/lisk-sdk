/* eslint-disable mocha/no-pending-tests */
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

const {
	BaseEntity,
} = require('../../../../../../../../src/components/storage/entities');
const {
	Transaction,
} = require('../../../../../../../../src/modules/chain/components/storage/entities');
const storageSandbox = require('../../../../../../common/storage_sandbox');
const seeder = require('../../../../../../common/storage_seed');
const transactionsFixtures = require('../../../../../../fixtures').transactions;
const transactionTypes = require('../../../../../../../../src/modules/chain/helpers/transaction_types');
const {
	NonSupportedFilterTypeError,
	NonSupportedOptionError,
} = require('../../../../../../../../src/components/storage/errors');

const numSeedRecords = 5;

const expectValidTransactionRow = (row, transaction) => {
	expect(row.id).to.be.eql(transaction.id);
	expect(row.blockId).to.be.eql(transaction.blockId);
	expect(row.type).to.be.eql(transaction.type);
	expect(row.timestamp).to.be.eql(transaction.timestamp);
	expect(row.senderPublicKey).to.be.eql(
		Buffer.from(transaction.senderPublicKey, 'hex')
	);
	expect(row.requesterPublicKey).to.be.eql(
		Buffer.from(transaction.requesterPublicKey, 'hex')
	);
	expect(row.senderId).to.be.eql(transaction.senderId);
	expect(row.recipientId).to.be.eql(transaction.recipientId);
	expect(row.amount).to.be.eql(transaction.amount);
	expect(row.fee).to.be.eql(transaction.fee);
	expect(row.signature).to.be.eql(Buffer.from(transaction.signature, 'hex'));
	expect(row.signSignature).to.be.eql(
		Buffer.from(transaction.signSignature, 'hex')
	);
	expect(row.signatures).to.be.eql(transaction.signatures.join());
};

const expectValidTransaction = (result, transaction, extended = true) => {
	expect(result.id).to.be.eql(transaction.id);
	expect(result.senderId).to.be.eql(transaction.senderId);
	expect(result.recipientId).to.be.eql(transaction.recipientId);
	expect(result.senderPublicKey).to.be.eql(transaction.senderPublicKey);

	// As we directly saved the transaction and not applied the account
	// So the recipientPublicKey for the account is not updated
	// expect(result.recipientPublicKey).to.be.eql(transaction.recipientPublicKey);

	expect(result.requesterPublicKey).to.be.eql(transaction.requesterPublicKey);
	expect(result.signature).to.be.eql(transaction.signature);
	expect(result.signatures).to.be.eql(transaction.signatures);
	expect(result.amount).to.be.eql(transaction.amount);
	expect(result.fee).to.be.eql(transaction.fee);
	expect(result.timestamp).to.be.eql(transaction.timestamp);
	expect(result.type).to.be.eql(transaction.type);

	if (extended) {
		expect(result.asset).to.be.eql(transaction.asset);
	}
};

describe('Transaction', () => {
	let adapter;
	let storage;
	let validTransactionSQLs;
	let validOptions;
	let validSimpleObjectFields;
	let validExtendedObjectFields;
	let SQLs;
	let validFilters;

	before(async () => {
		storage = new storageSandbox.StorageSandbox(
			__testContext.config.db,
			'lisk_test_storage_custom_transaction_chain_module'
		);
		await storage.bootstrap();

		SQLs = storage.entities.Transaction.SQLs;

		validFilters = [
			'id',
			'id_eql',
			'id_ne',
			'id_in',
			'id_like',
			'blockId',
			'blockId_eql',
			'blockId_ne',
			'blockId_in',
			'blockId_like',
			'blockHeight',
			'blockHeight_eql',
			'blockHeight_ne',
			'blockHeight_gt',
			'blockHeight_gte',
			'blockHeight_lt',
			'blockHeight_lte',
			'blockHeight_in',
			'type',
			'type_eql',
			'type_ne',
			'type_gt',
			'type_gte',
			'type_lt',
			'type_lte',
			'type_in',
			'timestamp',
			'timestamp_eql',
			'timestamp_ne',
			'timestamp_gt',
			'timestamp_gte',
			'timestamp_lt',
			'timestamp_lte',
			'timestamp_in',
			'senderPublicKey',
			'senderPublicKey_eql',
			'senderPublicKey_ne',
			'senderPublicKey_in',
			'senderPublicKey_like',
			'recipientPublicKey',
			'recipientPublicKey_eql',
			'recipientPublicKey_ne',
			'recipientPublicKey_in',
			'recipientPublicKey_like',
			'requesterPublicKey',
			'requesterPublicKey_eql',
			'requesterPublicKey_ne',
			'requesterPublicKey_in',
			'requesterPublicKey_like',
			'senderId',
			'senderId_eql',
			'senderId_ne',
			'senderId_in',
			'senderId_like',
			'recipientId',
			'recipientId_eql',
			'recipientId_ne',
			'recipientId_in',
			'recipientId_like',
			'amount',
			'amount_eql',
			'amount_ne',
			'amount_gt',
			'amount_gte',
			'amount_lt',
			'amount_lte',
			'amount_in',
			'fee',
			'fee_eql',
			'fee_ne',
			'fee_gt',
			'fee_gte',
			'fee_lt',
			'fee_lte',
			'fee_in',
			'data_like',
			'dapp_name',
			'dapp_link',
		];

		validSimpleObjectFields = [
			'id',
			'blockId',
			'height',
			'type',
			'timestamp',
			'senderId',
			'recipientId',
			'amount',
			'fee',
			'signature',
			'signSignature',
			'signatures',
			'senderPublicKey',
			'recipientPublicKey',
			'requesterPublicKey',
			'confirmations',
		];

		validExtendedObjectFields = [
			'asset',
			'id',
			'blockId',
			'height',
			'type',
			'timestamp',
			'senderId',
			'recipientId',
			'amount',
			'fee',
			'signature',
			'signSignature',
			'signatures',
			'senderPublicKey',
			'recipientPublicKey',
			'requesterPublicKey',
			'confirmations',
		];

		validOptions = {
			limit: 100,
			offset: 0,
		};

		validTransactionSQLs = ['create'];

		adapter = storage.adapter;
	});

	beforeEach(() => {
		return seeder.seed(storage);
	});

	afterEach(() => {
		sinonSandbox.reset();
		sinonSandbox.restore();
		return seeder.reset(storage);
	});

	it('should be a constructable function', async () => {
		expect(Transaction.prototype.constructor).not.to.be.null;
		expect(Transaction.prototype.constructor.name).to.be.eql(
			'ChainTransaction'
		);
	});

	it('should extend BaseEntity', async () => {
		expect(Transaction.prototype instanceof BaseEntity).to.be.true;
	});

	describe('constructor()', () => {
		it('should accept only one mandatory parameter', async () => {
			expect(Transaction.prototype.constructor.length).to.be.eql(1);
		});

		it('should have called super', async () => {
			// The reasoning here is that if the parent's contstructor was called
			// the properties from the parent are present in the extending object
			const transaction = new Transaction(adapter);
			expect(typeof transaction.parseFilters).to.be.eql('function');
			expect(typeof transaction.addFilter).to.be.eql('function');
			expect(typeof transaction.addField).to.be.eql('function');
			expect(typeof transaction.getFilters).to.be.eql('function');
			expect(typeof transaction.getUpdateSet).to.be.eql('function');
			expect(typeof transaction.getValuesSet).to.be.eql('function');
			expect(typeof transaction.begin).to.be.eql('function');
			expect(typeof transaction.validateFilters).to.be.eql('function');
			expect(typeof transaction.validateOptions).to.be.eql('function');
		});

		it('should assign proper sql', async () => {
			const transaction = new Transaction(adapter);
			expect(transaction.SQLs).to.include.all.keys(validTransactionSQLs);
		});
	});

	describe('create()', () => {
		it('should save single transaction', async () => {
			const block = seeder.getLastBlock();
			const transaction = new transactionsFixtures.Transaction({
				blockId: block.id,
			});
			let result = await storage.entities.Transaction.create(transaction);

			result = await storage.adapter.execute('SELECT * from trs');

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(1);
			expectValidTransactionRow(result[0], transaction);
		});

		it('should save multiple transactions', async () => {
			const block = seeder.getLastBlock();
			const transaction1 = new transactionsFixtures.Transaction({
				blockId: block.id,
			});
			const transaction2 = new transactionsFixtures.Transaction({
				blockId: block.id,
			});
			let result = await storage.entities.Transaction.create([
				transaction1,
				transaction2,
			]);

			result = await storage.adapter.execute('SELECT * from trs');

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(2);
			expectValidTransactionRow(result[0], transaction1);
			expectValidTransactionRow(result[1], transaction2);
		});

		it('should throw error if serialization to any attribute failed', async () => {
			const block = seeder.getLastBlock();
			const transaction = new transactionsFixtures.Transaction({
				blockId: block.id,
			});
			transaction.senderPublicKey = 'ABFGH';

			return expect(
				storage.entities.Transaction.create(transaction)
			).to.be.rejectedWith('invalid hexadecimal digit: "G"');
		});

		it('should populate asset field with "transfer" json for type 0 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionTypes.SEND,
					})
				);
			}
			await storage.entities.Transaction.create(transactions);
			const transactionIds = transactions.map(({ id }) => id);
			const result = await storage.entities.Transaction.get(
				{ id_in: transactionIds },
				{ extended: true }
			);

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.id)).to.be.eql(transactions.map(t => t.id));
			expect(result.map(r => r.asset.data)).to.be.eql(
				transactions.map(t => t.asset.data)
			);
		});

		it('should populate asset field with "signatures" json for type 1 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionTypes.SIGNATURE,
					})
				);
			}
			await storage.entities.Transaction.create(transactions);
			const transactionIds = transactions.map(({ id }) => id);
			const result = await storage.entities.Transaction.get(
				{ id_in: transactionIds },
				{ extended: true }
			);

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.id)).to.be.eql(transactions.map(t => t.id));
			expect(result.map(r => r.asset.signature)).to.be.eql(
				transactions.map(t => t.asset.signature)
			);
		});

		it('should populate asset field with "delegates" json for type 2 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionTypes.DELEGATE,
					})
				);
			}
			await storage.entities.Transaction.create(transactions);
			const transactionIds = transactions.map(({ id }) => id);
			const result = await storage.entities.Transaction.get(
				{ id_in: transactionIds },
				{ extended: true }
			);

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.id)).to.be.eql(transactions.map(t => t.id));
			expect(result.map(r => r.asset.delegate)).to.be.eql(
				transactions.map(t => t.asset.delegate)
			);
		});

		it('should populate asset field with "votes" json for type 3 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionTypes.VOTE,
					})
				);
			}
			await storage.entities.Transaction.create(transactions);
			const transactionIds = transactions.map(({ id }) => id);
			const result = await storage.entities.Transaction.get(
				{ id_in: transactionIds },
				{ extended: true }
			);

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.id)).to.be.eql(transactions.map(t => t.id));
			expect(result.map(r => r.asset.votes)).to.be.eql(
				transactions.map(t => t.asset.votes)
			);
		});

		it('should populate asset field with "multisignatures" json for type 4 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionTypes.MULTI,
					})
				);
			}
			await storage.entities.Transaction.create(transactions);
			const transactionIds = transactions.map(({ id }) => id);
			const result = await storage.entities.Transaction.get(
				{ id_in: transactionIds },
				{ extended: true }
			);

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.id)).to.be.eql(transactions.map(t => t.id));
			expect(result.map(r => r.asset.multisignature)).to.be.eql(
				transactions.map(t => t.asset.multisignature)
			);
		});

		it('should populate asset field with "dapps" json for type 5 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionTypes.DAPP,
					})
				);
			}
			await storage.entities.Transaction.create(transactions);
			const transactionIds = transactions.map(({ id }) => id);
			const result = await storage.entities.Transaction.get(
				{ id_in: transactionIds },
				{ extended: true }
			);

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.id)).to.be.eql(transactions.map(t => t.id));
			expect(result.map(t => t.asset.dapp)).to.be.eql(
				transactions.map(t => t.asset.dapp)
			);
		});

		it('should populate asset field with "intransfer" json for type 6 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionTypes.IN_TRANSFER,
					})
				);
			}
			await storage.entities.Transaction.create(transactions);
			const transactionIds = transactions.map(({ id }) => id);
			const result = await storage.entities.Transaction.get(
				{ id_in: transactionIds },
				{ extended: true }
			);

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.id)).to.be.eql(transactions.map(t => t.id));
			expect(result.map(r => r.asset.inTransfer.transactionId)).to.be.eql(
				transactions.map(t => t.asset.inTransfer.transactionId)
			);
			expect(result.map(r => r.asset.inTransfer.dappId)).to.be.eql(
				transactions.map(t => t.asset.inTransfer.dappId)
			);
		});

		it('should populate asset field with "outtransfer" json for type 7 transactions', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];
			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionTypes.OUT_TRANSFER,
					})
				);
			}
			await storage.entities.Transaction.create(transactions);
			const transactionIds = transactions.map(({ id }) => id);
			const result = await storage.entities.Transaction.get(
				{ id_in: transactionIds },
				{ extended: true }
			);

			expect(result).to.not.empty;
			expect(result).to.have.lengthOf(numSeedRecords);
			expect(result.map(r => r.id)).to.be.eql(transactions.map(t => t.id));
			expect(result.map(r => r.asset.outTransfer.transactionId)).to.be.eql(
				transactions.map(t => t.asset.outTransfer.transactionId)
			);
			expect(result.map(r => r.asset.outTransfer.dappId)).to.be.eql(
				transactions.map(t => t.asset.outTransfer.dappId)
			);
		});
	});

	describe('get()', () => {
		beforeEach(() => {
			return sinonSandbox.restore();
		});
		it('should accept only valid filters', async () => {
			// Arrange
			const transaction = new Transaction(adapter);
			const transactions = [
				new transactionsFixtures.Transaction({
					blockId: seeder.getLastBlock().id,
				}),
			];
			await transaction.create(transactions);
			const validFilter = {
				id: transactions[0].id,
			};
			// Act & Assert
			expect(() => {
				transaction.get(validFilter);
			}).not.to.throw(NonSupportedFilterTypeError);
		});
		it('should throw error for invalid filters');
		it('should accept only valid options');
		it('should throw error for invalid options');

		it('should call adapter.executeFile with proper param for extended=false', async () => {
			// Arrange
			sinonSandbox.spy(adapter, 'executeFile');
			const transaction = new Transaction(adapter);
			// Act
			transaction.get();
			// Assert
			expect(adapter.executeFile.firstCall.args[0]).to.be.eql(SQLs.select);
		});

		it('should call adapter.executeFile with proper param for extended=true', async () => {
			// Arrange
			sinonSandbox.spy(adapter, 'executeFile');
			const transaction = new Transaction(adapter);
			// Act
			transaction.get({}, { extended: true });
			// Assert
			expect(adapter.executeFile.firstCall.args[0]).to.be.eql(
				SQLs.selectExtended
			);
		});

		it('should accept "tx" as last parameter and pass to adapter.executeFile', async () => {
			// Arrange
			const transaction = new Transaction(adapter);
			const transactions = [
				new transactionsFixtures.Transaction({
					blockId: seeder.getLastBlock().id,
				}),
			];
			await transaction.create(transactions);
			const validFilter = {
				id: transactions[0].id,
			};
			const _getSpy = sinonSandbox.spy(transaction, 'get');
			// Act & Assert
			await transaction.begin('testTX', async tx => {
				await transaction.get(validFilter, {}, tx);
				expect(Object.getPrototypeOf(_getSpy.firstCall.args[2])).to.be.eql(
					Object.getPrototypeOf(tx)
				);
			});
		});

		it('should resolve with one object matching specification of type definition of simple object', async () => {
			// Arrange
			const transaction = new Transaction(adapter);
			const transactions = [
				new transactionsFixtures.Transaction({
					blockId: seeder.getLastBlock().id,
				}),
			];
			await transaction.create(transactions);
			const validFilter = {
				id: transactions[0].id,
			};
			// Act
			const results = await transaction.get(validFilter, { extended: false });
			// Assert
			expect(results[0]).to.have.all.keys(validSimpleObjectFields);
		});

		it('should resolve with one object matching specification of type definition of full object', async () => {
			// Arrange
			const transaction = new Transaction(adapter);
			const transactions = [
				new transactionsFixtures.Transaction({
					blockId: seeder.getLastBlock().id,
				}),
			];
			await transaction.create(transactions);
			const validFilter = {
				id: transactions[0].id,
			};
			// Act
			const results = await transaction.get(validFilter, { extended: true });
			// Assert
			expect(results[0]).to.have.all.keys(validExtendedObjectFields);
		});
		it('should not change any of the provided parameter');

		it('should return result in valid format', async () => {
			let transaction = null;
			const transactions = [];

			for (let i = 0; i < numSeedRecords; i++) {
				transaction = new transactionsFixtures.Transaction({
					blockId: seeder.getLastBlock().id,
				});
				transactions.push(transaction);
			}
			await storage.entities.Transaction.create(transactions);

			// Check for last transaction
			const result = await storage.entities.Transaction.get({
				id: transaction.id,
			});

			expect(result).to.not.empty;
			expect(result).to.be.lengthOf(1);
			expect(result[0].id).to.be.eql(transaction.id);
			expectValidTransaction(result[0], transaction, false);
		});

		it('should return result valid format for extended version', async () => {
			let transaction = null;
			const transactions = [];

			for (let i = 0; i < numSeedRecords; i++) {
				transaction = new transactionsFixtures.Transaction({
					blockId: seeder.getLastBlock().id,
				});
				transactions.push(transaction);
			}
			await storage.entities.Transaction.create(transactions);

			// Check for last transaction
			const result = await storage.entities.Transaction.get(
				{
					id: transaction.id,
				},
				{
					limit: 10,
					offset: 0,
					extended: true,
				}
			);

			expect(result).to.not.empty;
			expect(result).to.be.lengthOf(1);
			expect(result[0].id).to.be.eql(transaction.id);
			expectValidTransaction(result[0], transaction);
		});

		it('should paginate the results properly', async () => {
			const block = seeder.getLastBlock();
			let transaction = null;
			const transactions = [];

			for (let i = 0; i < numSeedRecords; i++) {
				transaction = new transactionsFixtures.Transaction({
					blockId: block.id,
				});
				transactions.push(transaction);
			}
			await storage.entities.Transaction.create(transactions);

			const result1 = await storage.entities.Transaction.get(
				{
					blockId: block.id,
				},
				{
					limit: 2,
					offset: 0,
				}
			);

			const result2 = await storage.entities.Transaction.get(
				{
					blockId: block.id,
				},
				{
					limit: 2,
					offset: 1,
				}
			);
			expect(result1).to.not.empty;
			expect(result2).to.not.empty;
			expect(result1).to.be.lengthOf(2);
			expect(result2).to.be.lengthOf(2);
			return expect(result1[1]).to.be.eql(result2[0]);
		});

		it('should sort the results for provided "sortField"', async () => {
			const block = seeder.getLastBlock();
			const transactions = [];

			for (let i = 0; i < numSeedRecords; i++) {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
					})
				);
			}
			await storage.entities.Transaction.create(transactions);

			const result = await storage.entities.Transaction.get(
				{
					blockId: block.id,
				},
				{
					sort: 'id:desc',
					limit: 20,
					offset: 0,
				}
			);

			expect(result).to.be.eql(_.orderBy(result, 'id', 'desc'));
		});

		describe('filters', () => {
			// To make add/remove filters we add their tests.
			it('should have only specific filters', async () => {
				const transaction = new Transaction(adapter);
				expect(transaction.getFilters()).to.eql(validFilters);
			});
			// For each filter type
			it('should return matching result for provided filter');
		});
	});

	describe('getOne()', () => {
		it('should accept only valid filters', async () => {
			// Arrange
			const aTransaction = new transactionsFixtures.Transaction({
				blockId: seeder.getLastBlock().id,
			});
			const transaction = new Transaction(adapter);
			await transaction.create(aTransaction);
			const validFilter = {
				senderId: aTransaction.senderId,
			};

			// Act & Assert
			expect(() => {
				transaction.getOne(validFilter);
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		// The implementation of the test is ready but should work implementation in code in different PR
		// eslint-disable-next-line mocha/no-skipped-tests
		it.skip('should throw error for invalid filters', async () => {
			// Arrange
			const aTransaction = new transactionsFixtures.Transaction({
				blockId: seeder.getLastBlock().id,
			});
			const transaction = new Transaction(adapter);
			await transaction.create(aTransaction);
			const invalidFilter = {
				nonExistentField: aTransaction.senderId,
			};

			// Act & Assert
			expect(() => {
				transaction.getOne(invalidFilter);
			}).to.throw(NonSupportedFilterTypeError);
		});

		// The implementation of the test is ready but should work implementation in code in different PR
		// eslint-disable-next-line mocha/no-skipped-tests
		it.skip('should accept only valid options', async () => {
			// Arrange
			const transaction = new Transaction(adapter);
			// Act & Assert
			expect(() => {
				transaction.getOne({}, validOptions);
			}).not.to.throw(NonSupportedOptionError);
		});

		// The implementation of the test is ready but should work implementation in code in different PR
		// eslint-disable-next-line mocha/no-skipped-tests
		it.skip('should throw error for invalid options', async () => {
			// Arrange
			const aTransaction = new transactionsFixtures.Transaction({
				blockId: seeder.getLastBlock().id,
			});
			const transaction = new Transaction(adapter);
			await transaction.create(aTransaction);
			const invalidOptions = {
				foo: 'bar',
			};
			// Act & Assert
			expect(() => {
				transaction.getOne({}, invalidOptions);
			}).to.throw(NonSupportedOptionError);
		});

		it('should resolve with one object matching specification of type definition of simple object', async () => {
			// Arrange
			const aTransaction = new transactionsFixtures.Transaction({
				blockId: seeder.getLastBlock().id,
			});
			const transaction = new Transaction(adapter);
			await transaction.create(aTransaction);
			// Act
			const results = await transaction.getOne(
				{
					id: aTransaction.id,
				},
				{
					extended: false,
				}
			);
			expect(results).to.have.all.keys(validSimpleObjectFields);
		});

		it('should reject with error if matched with multiple records for provided filters', async () => {
			// Arrange
			const transaction = new Transaction(adapter);
			const transactions = [
				new transactionsFixtures.Transaction({
					blockId: seeder.getLastBlock().id,
				}),
				new transactionsFixtures.Transaction({
					blockId: seeder.getLastBlock().id,
				}),
			];
			await transaction.create(transactions);
			// Act
			expect(
				transaction.getOne({
					blockId: transactions[0].blockId,
				})
			).to.be.rejected;
			// Assert
		});

		describe('filters', () => {
			// To make add/remove filters we add their tests.
			it('should have only specific filters', async () => {
				// Arrange
				const transaction = new Transaction(adapter);
				// Act & Assert
				expect(transaction.getFilters()).to.eql(validFilters);
			});
			// For each filter type
			it('should return matching result for provided filter');
		});
	});
});
