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
	Transaction,
} = require('../../../../../../src/components/storage/entities');
const storageSandbox = require('../../../../common/storage_sandbox');
const seeder = require('../../../../common/storage_seed');
const transactionsFixtures = require('../../../../fixtures').transactions;
const {
	NonSupportedFilterTypeError,
	NonSupportedOperationError,
} = require('../../../../../../src/components/storage/errors');

const numSeedRecords = 5;
const NON_EXISTENT_ID = '1234';

describe('Transaction', () => {
	let adapter;
	let storage;
	let validTransactionSQLs;
	let addFieldSpy;
	let validFilters;
	let SQLs;

	before(async () => {
		storage = new storageSandbox.StorageSandbox(
			__testContext.config.db,
			'lisk_test_transactions'
		);
		await storage.bootstrap();

		SQLs = storage.entities.Transaction.SQLs;

		validTransactionSQLs = ['select', 'selectExtended', 'isPersisted', 'count'];

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

		adapter = storage.adapter;
	});

	beforeEach(() => {
		addFieldSpy = sinonSandbox.spy(Transaction.prototype, 'addField');
		return seeder.seed(storage);
	});

	afterEach(() => {
		sinonSandbox.reset();
		sinonSandbox.restore();
		return seeder.reset(storage);
	});

	it('should be a constructable function', async () => {
		expect(Transaction.prototype.constructor).not.to.be.null;
		expect(Transaction.prototype.constructor.name).to.be.eql('Transaction');
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

		it('should call addField the exact number of times', async () => {
			const transaction = new Transaction(adapter);
			expect(addFieldSpy.callCount).to.eql(
				Object.keys(transaction.fields).length
			);
		});

		it('should setup specific filters', async () => {
			const transaction = new Transaction(adapter);
			expect(transaction.getFilters()).to.have.members(validFilters);
		});
	});

	describe('create()', () => {
		it('should always throw NonSupportedOperationError', async () => {
			expect(Transaction.prototype.delete).to.throw(NonSupportedOperationError);
		});
	});

	describe('update()', () => {
		it('should always throw NonSupportedOperationError', async () => {
			expect(Transaction.prototype.update).to.throw(NonSupportedOperationError);
		});
	});

	describe('updateOne()', () => {
		it('should always throw NonSupportedOperationError', async () => {
			expect(Transaction.prototype.updateOne).to.throw(
				NonSupportedOperationError
			);
		});
	});

	describe('delete()', () => {
		it('should always throw NonSupportedOperationError', async () => {
			expect(Transaction.prototype.delete).to.throw(NonSupportedOperationError);
		});
	});

	describe('isPersisted()', () => {
		afterEach(async () => {
			await storageSandbox.clearDatabaseTable(storage, storage.logger, 'trs');
		});

		it('should accept only valid filters', async () => {
			const block = seeder.getLastBlock();
			const transactionFixture = new transactionsFixtures.Transaction({
				blockId: block.id,
			});
			await storage.entities.Transaction.create(transactionFixture);

			const transaction = new Transaction(adapter);
			expect(() => {
				transaction.isPersisted({ id: transactionFixture.id });
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const transaction = new Transaction(adapter);
			expect(() => {
				transaction.isPersisted({ invalid: true });
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should call mergeFilters with proper params', async () => {
			// Arrange
			const block = seeder.getLastBlock();
			const randTransaction = new transactionsFixtures.Transaction({
				blockId: block.id,
			});
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns(),
				executeFile: sinonSandbox.stub().resolves([randTransaction]),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const validFilter = {
				id: randTransaction.id,
			};
			const transaction = new Transaction(localAdapter);
			transaction.mergeFilters = sinonSandbox.stub();
			transaction.parseFilters = sinonSandbox.stub();
			// Act
			transaction.isPersisted(validFilter);
			// Assert
			expect(transaction.mergeFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call parseFilters with proper params', async () => {
			// Arrange
			const block = seeder.getLastBlock();
			const randTransaction = new transactionsFixtures.Transaction({
				blockId: block.id,
			});
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns(),
				executeFile: sinonSandbox.stub().resolves([randTransaction]),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const validFilter = {
				id: randTransaction.id,
			};
			const transaction = new Transaction(localAdapter);
			transaction.mergeFilters = sinonSandbox.stub().returns(validFilter);
			transaction.parseFilters = sinonSandbox.stub();
			// Act
			transaction.isPersisted(validFilter);
			// Assert
			expect(transaction.parseFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call adapter.executeFile with proper params', async () => {
			// Arrange
			sinonSandbox.spy(adapter, 'executeFile');
			const block = seeder.getLastBlock();
			const randTransaction = new transactionsFixtures.Transaction({
				blockId: block.id,
			});
			const transaction = new Transaction(adapter);
			// Act
			await transaction.isPersisted({ id: randTransaction.id });
			// Assert
			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile.firstCall.args[0]).to.be.eql(SQLs.isPersisted);
		});

		it('should resolve with true if matching record found', async () => {
			const block = seeder.getLastBlock();
			const transactionFixture = new transactionsFixtures.Transaction({
				blockId: block.id,
			});
			await storage.entities.Transaction.create(transactionFixture);
			const res = await storage.entities.Transaction.isPersisted({
				id: transactionFixture.id,
			});
			expect(res).to.be.true;
		});

		it('should resolve with false if matching record not found', async () => {
			const block = seeder.getLastBlock();
			const transactionFixture = new transactionsFixtures.Transaction({
				blockId: block.id,
			});
			await storage.entities.Transaction.create(transactionFixture);
			const res = await storage.entities.Transaction.isPersisted({
				id: 'invalidTransactionID',
			});
			expect(res).to.be.false;
		});

		it('It should return true using type as filter', async () => {
			const transactions = [];
			const block = seeder.getLastBlock();
			[0, 1, 2, 3, 4, 5, 6, 7].forEach(transactionType => {
				transactions.push(
					new transactionsFixtures.Transaction({
						blockId: block.id,
						type: transactionType,
					})
				);
			});
			await storage.entities.Transaction.create(transactions);
			expect(
				await storage.entities.Transaction.isPersisted({
					id: transactions[0].id,
					type: 0,
				})
			).to.be.true;
			expect(
				await storage.entities.Transaction.isPersisted({
					id: transactions[1].id,
					type: 1,
				})
			).to.be.true;
			expect(
				await storage.entities.Transaction.isPersisted({
					id: transactions[2].id,
					type: 2,
				})
			).to.be.true;
			expect(
				await storage.entities.Transaction.isPersisted({
					id: transactions[3].id,
					type: 3,
				})
			).to.be.true;
			expect(
				await storage.entities.Transaction.isPersisted({
					id: transactions[4].id,
					type: 4,
				})
			).to.be.true;
			expect(
				await storage.entities.Transaction.isPersisted({
					id: transactions[5].id,
					type: 5,
				})
			).to.be.true;
			expect(
				await storage.entities.Transaction.isPersisted({
					id: transactions[6].id,
					type: 6,
				})
			).to.be.true;
			expect(
				await storage.entities.Transaction.isPersisted({
					id: transactions[7].id,
					type: 7,
				})
			).to.be.true;
		});
	});

	describe('count()', () => {
		it('should accept only valid filters');
		it('should throw error for invalid filters');
		it('should resolve with integer value if matching record found', async () => {
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
			const result = await storage.entities.Transaction.count({
				id: transaction.id,
			});

			expect(result).to.be.a('number');
			return expect(result).to.be.eql(1);
		});

		it('should resolve with zero if matching record not found', async () => {
			const result = await storage.entities.Transaction.count({
				id: NON_EXISTENT_ID,
			});

			expect(result).to.be.a('number');
			return expect(result).to.be.eql(0);
		});

		it('should use view query file if some conditions provided', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			await storage.entities.Transaction.count({
				id: NON_EXISTENT_ID,
			});

			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile).to.be.calledWith(SQLs.count);
		});

		it('should use trs  query file if no conditions provided', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			await storage.entities.Transaction.count();

			expect(adapter.executeFile).to.be.calledOnce;
			expect(adapter.executeFile).to.be.calledWith(SQLs.count_all);
		});
	});
});
