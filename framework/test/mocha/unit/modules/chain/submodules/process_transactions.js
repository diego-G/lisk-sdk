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

const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const rewire = require('rewire');
const {
	Transaction: transactionFxiture,
} = require('../../../../fixtures/transactions');

const ProcessTransactions = rewire(
	'../../../../../../src/modules/chain/submodules/process_transactions'
);

describe('ProcessTransactions', () => {
	let processTransactions;

	const trs1 = transactionFxiture();
	trs1.matcher = () => true;

	const trs2 = transactionFxiture();
	trs2.matcher = () => true;

	const dummyState = {
		version: 1,
		height: 1,
		timestamp: 'aTimestamp',
	};

	const storageMock = {
		entities: {
			Transaction: {
				get: sinonSandbox.stub(),
			},
		},
	};

	const paramScope = {
		components: {
			storage: storageMock,
		},
		modules: {
			blocks: {
				lastBlock: {
					get: sinonSandbox.stub().returns(dummyState),
				},
			},
		},
	};

	beforeEach(done => {
		// Act
		processTransactions = new ProcessTransactions(() => {
			processTransactions.onBind(paramScope);
			done();
		}, paramScope);
	});

	describe('constructor()', () => {
		it('should create instance of module', async () => {
			expect(processTransactions).to.be.instanceOf(ProcessTransactions);
		});

		it('should assign parameters correctly', async () => {
			const library = ProcessTransactions.__get__('library');

			expect(library.storage).to.be.eql(paramScope.components.storage);
		});

		it('should invoke the callback', done => {
			const cb = (error, object) => {
				expect(error).to.be.null;
				expect(object).to.be.instanceOf(ProcessTransactions);
				done();
			};
			new ProcessTransactions(cb, paramScope);
		});
	});

	describe('onBind()', () => {
		it('should assign params correctly to library', async () => {
			const library = ProcessTransactions.__get__('library');

			expect(library.modules.blocks).to.be.eql(paramScope.modules.blocks);
		});
	});

	describe('validateTransactions()', () => {
		const validResponse = { status: TransactionStatus.OK, id: trs1.id };
		const invalidResponse = { status: TransactionStatus.FAIL, id: trs2.id };

		beforeEach(async () => {
			trs1.validate = sinonSandbox.stub().returns(validResponse);
			trs2.validate = sinonSandbox.stub().returns(invalidResponse);
		});

		it('should invoke validate() on each transaction', async () => {
			processTransactions.validateTransactions([trs1, trs2]);

			expect(trs1.validate).to.be.calledOnce;
			expect(trs2.validate).to.be.calledOnce;
		});

		it('should update responses for exceptions for invalid responses', async () => {
			const exceptionStub = sinonSandbox.stub();
			ProcessTransactions.__set__(
				'updateTransactionResponseForExceptionTransactions',
				exceptionStub
			);

			processTransactions.validateTransactions([trs1, trs2]);

			expect(exceptionStub).to.be.calledOnce;
			expect(exceptionStub).to.be.calledWithExactly(
				[invalidResponse],
				[trs1, trs2]
			);
		});

		it('should return transaction responses', async () => {
			const result = processTransactions.validateTransactions([trs1, trs2]);

			expect(result).to.be.eql({
				transactionsResponses: [validResponse, invalidResponse],
			});
		});
	});

	describe('checkPersistedTransactions()', () => {
		it('should resolve in empty response if called with empty array', async () => {
			const result = await processTransactions.checkPersistedTransactions([]);

			expect(result).to.be.eql({ transactionsResponses: [] });
		});
		it('should invoke entities.Transaction to check persistence of transactions', async () => {
			storageMock.entities.Transaction.get.resolves([trs1, trs2]);

			await processTransactions.checkPersistedTransactions([trs1, trs2]);

			expect(storageMock.entities.Transaction.get).to.be.calledOnce;
			expect(storageMock.entities.Transaction.get).to.be.calledWithExactly({
				id_in: [trs1.id, trs2.id],
			});
		});

		it('should return TransactionStatus.OK for non-persisted transactions', async () => {
			// Treat trs1 as persisted transaction
			storageMock.entities.Transaction.get.resolves([trs1]);

			const result = await processTransactions.checkPersistedTransactions([
				trs1,
				trs2,
			]);

			const transactionResponse = result.transactionsResponses.find(
				({ id }) => id === trs2.id
			);

			expect(transactionResponse.status).to.be.eql(TransactionStatus.OK);
			expect(transactionResponse.errors).to.be.eql([]);
		});

		it('should return TransactionStatus.FAIL for persisted transactions', async () => {
			// Treat trs1 as persisted transaction
			storageMock.entities.Transaction.get.resolves([trs1]);

			const result = await processTransactions.checkPersistedTransactions([
				trs1,
				trs2,
			]);

			const transactionResponse = result.transactionsResponses.find(
				({ id }) => id === trs1.id
			);

			expect(transactionResponse.status).to.be.eql(TransactionStatus.FAIL);
			expect(transactionResponse.errors).have.lengthOf(1);
			expect(transactionResponse.errors[0].message).to.be.eql(
				`Transaction is already confirmed: ${trs1.id}`
			);
		});
	});

	describe('checkAllowedTransactions', () => {
		let checkAllowedTransactionsSpy;

		beforeEach(async () => {
			// Arrange
			checkAllowedTransactionsSpy = sinonSandbox.spy(
				processTransactions,
				'checkAllowedTransactions'
			);
		});

		it('should accept two exact arguments with proper data', async () => {
			// Act
			processTransactions.checkAllowedTransactions([trs1], dummyState);

			// Assert
			expect(checkAllowedTransactionsSpy).to.have.been.calledWithExactly(
				[trs1],
				dummyState
			);
		});

		it('should return a proper response format', async () => {
			// Act
			const response = processTransactions.checkAllowedTransactions(
				[trs1],
				dummyState
			);

			// Assert
			expect(response).to.have.deep.property('transactionsResponses', [
				{
					id: trs1.id,
					status: 1,
					errors: [],
				},
			]);
		});

		it('in case of non allowed transactions, it should return responses with TransactionStatus.FAIL and proper error message', async () => {
			// Arrange
			const disallowedTransaction = {
				...trs1[0],
				matcher: () => false,
			};

			// Act
			const response = processTransactions.checkAllowedTransactions(
				[disallowedTransaction],
				dummyState
			);

			// Assert
			expect(response.transactionsResponses.length).to.equal(1);
			expect(response.transactionsResponses[0]).to.have.property(
				'id',
				disallowedTransaction.id
			);
			expect(response.transactionsResponses[0]).to.have.property(
				'status',
				TransactionStatus.FAIL
			);
			expect(response.transactionsResponses[0].errors.length).to.equal(1);
			expect(response.transactionsResponses[0].errors[0]).to.be.instanceOf(
				Error
			);
			expect(response.transactionsResponses[0].errors[0].message).to.equal(
				`Transaction type ${
					disallowedTransaction.type
				} is currently not allowed.`
			);
		});

		it('should report a transaction as allowed if it does not implement matcher', async () => {
			// Arrange
			const { matcher, ...transactionWithoutMatcherImpl } = trs1;

			// Act
			const response = processTransactions.checkAllowedTransactions(
				[transactionWithoutMatcherImpl],
				dummyState
			);

			// Assert
			expect(response.transactionsResponses.length).to.equal(1);
			expect(response.transactionsResponses[0]).to.have.property(
				'id',
				transactionWithoutMatcherImpl.id
			);
			expect(response.transactionsResponses[0]).to.have.property(
				'status',
				TransactionStatus.OK
			);
			expect(response.transactionsResponses[0].errors.length).to.equal(0);
		});

		it('in case of allowed transactions, it should return responses with TransactionStatus.OK and no errors', async () => {
			// Arrange
			const allowedTransaction = {
				...trs1[0],
				matcher: () => true,
			};

			// Act
			const response = processTransactions.checkAllowedTransactions(
				[allowedTransaction],
				dummyState
			);

			// Assert
			expect(response.transactionsResponses.length).to.equal(1);
			expect(response.transactionsResponses[0]).to.have.property(
				'id',
				allowedTransaction.id
			);
			expect(response.transactionsResponses[0]).to.have.property(
				'status',
				TransactionStatus.OK
			);
			expect(response.transactionsResponses[0].errors.length).to.equal(0);
		});

		it('should return a mix of responses including allowed and disallowed transactions', async () => {
			// Arrange
			const transactions = [
				trs1, // Allowed
				{
					...trs1,
					matcher: () => false, // Disallowed
				},
			];

			// Act
			const response = processTransactions.checkAllowedTransactions(
				transactions,
				dummyState
			);

			// Assert
			expect(response.transactionsResponses.length).to.equal(2);
			// Allowed transaction formatted response check
			expect(response.transactionsResponses[0]).to.have.property(
				'id',
				transactions[0].id
			);
			expect(response.transactionsResponses[0]).to.have.property(
				'status',
				TransactionStatus.OK
			);
			expect(response.transactionsResponses[0].errors.length).to.equal(0);

			// Allowed transaction formatted response check
			expect(response.transactionsResponses[1]).to.have.property(
				'id',
				transactions[1].id
			);
			expect(response.transactionsResponses[1]).to.have.property(
				'status',
				TransactionStatus.FAIL
			);
			expect(response.transactionsResponses[1].errors.length).to.equal(1);
			expect(response.transactionsResponses[1].errors[0]).to.be.instanceOf(
				Error
			);
			expect(response.transactionsResponses[1].errors[0].message).to.equal(
				`Transaction type ${transactions[1].type} is currently not allowed.`
			);
		});
	});

	describe('_getCurrentContext', () => {
		let result;

		beforeEach(async () => {
			// Act
			result = ProcessTransactions._getCurrentContext();
		});

		it('should call lastBlock.get', async () => {
			// Assert
			expect(paramScope.modules.blocks.lastBlock.get).to.have.been.called;
		});

		it('should return version, height and timestamp wrapped in an object', async () => {
			// Assert
			expect(result).to.have.property('blockVersion', dummyState.version);
			expect(result).to.have.property('blockHeight', dummyState.height);
			expect(result).to.have.property('blockTimestamp', dummyState.timestamp);
		});
	});
});
