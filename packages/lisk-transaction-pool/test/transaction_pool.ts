import addresses from '../fixtures/addresses.json';
import { expect } from 'chai';
import transactionObjects from '../fixtures/transactions.json';
import { TransactionPool } from '../src/transaction_pool';
import { wrapTransferTransaction } from './utils/add_transaction_functions';
import * as sinon from 'sinon';
// Require is used for stubbing
const Queue = require('../src/queue').Queue;
const queueCheckers = require('../src/queue_checkers');

describe('transaction pool', () => {
	let transactionPool: TransactionPool;
	const transactions = transactionObjects.map(wrapTransferTransaction);

	let stubs: {
		[key: string]: sinon.SinonStub;
	};

	beforeEach(() => {
		stubs = {
			checkTransactionPropertyForValues: sandbox.stub(
				queueCheckers,
				'checkTransactionPropertyForValues',
			),
			checkTransactionForSenderPublicKey: sandbox.stub(
				queueCheckers,
				'checkTransactionForSenderPublicKey',
			),
			checkTransactionForId: sandbox.stub(
				queueCheckers,
				'checkTransactionForId',
			),
			checkTransactionForRecipientId: sandbox.stub(
				queueCheckers,
				'checkTransactionForRecipientId',
			),
		};

		transactionPool = new TransactionPool();
		Object.keys(transactionPool.queues).forEach(queueName => {
			sandbox
				.stub((transactionPool as any)._queues, queueName)
				.value(sinon.createStubInstance(Queue));
		});
		return;
	});

	afterEach(() => {
		return sandbox.restore();
	});

	describe('#addTransactions', () => {});
	describe('#getProcessableTransactions', () => {});
	describe('#onDeleteBlock', () => {
		const block = {
			transactions: [transactions[0], transactions[1], transactions[2]],
		};

		it('should call checkTransactionForRecipientId with block transactions', () => {
			transactionPool.onDeleteBlock(block);
			return expect(stubs.checkTransactionForRecipientId).to.be.calledWithExactly(
				block.transactions,
			);
		});

		it('should call removeFor for verified, pending and ready queues once', () => {
			transactionPool.onDeleteBlock(block);
			const { pending, verified, ready } = transactionPool.queues;
			expect(pending.removeFor).to.be.calledOnce;
			expect(verified.removeFor).to.be.calledOnce;
			return expect(ready.removeFor).to.be.calledOnce;
		});

		it('should call enqueueMany for verified queue with transactions from the deleted block', () => {
			transactionPool.onDeleteBlock(block);
			return expect(transactionPool.queues.verified.enqueueMany).to.be.calledWith(
				block.transactions,
			);
		});

		it('should call enqueueMany for validated queue with transactions removed from other queues', () => {
			const { received, validated, ...otherQueues } = transactionPool.queues;
			const removedTransactions = Object.keys(otherQueues)
				.map(queueName => {
					const removedTransactions = [transactions[0]];
					(transactionPool.queues[queueName]
						.removeFor as sinon.SinonStub).returns(removedTransactions);
					return removedTransactions;
				})
				.reduce((acc, value) => acc.concat(value), []);
			transactionPool.onDeleteBlock(block);
			return expect(transactionPool.queues.validated.enqueueMany).to.be.calledWith(
				removedTransactions,
			);
		});
	});

	describe('#onNewBlock', () => {
		const block = {
			transactions: [transactions[0], transactions[1], transactions[2]],
		};

		it('should call checkTransactionForId with block transactions', () => {
			transactionPool.onNewBlock(block);
			return expect(stubs.checkTransactionForId).to.be.calledWithExactly(
				block.transactions,
			);
		});

		it('should call checkTransactionForSenderPublicKey with block transactions', () => {
			transactionPool.onNewBlock(block);
			return expect(stubs.checkTransactionForSenderPublicKey).to.be.calledWithExactly(
				block.transactions,
			);
		});

		it('should call removeFor for received and validated queues once', () => {
			transactionPool.onNewBlock(block);
			const { received, validated } = transactionPool.queues;
			expect(received.removeFor).to.be.calledOnce;
			return expect(validated.removeFor).to.be.calledOnce;
		});

		it('should call removeFor for pending, verified and ready queues thrice', () => {
			transactionPool.onNewBlock(block);
			const { pending, verified, ready } = transactionPool.queues;
			expect(pending.removeFor).to.be.calledThrice;
			expect(verified.removeFor).to.be.calledThrice;
			return expect(ready.removeFor).to.be.calledThrice;
		});

		it('should call enqueueMany for validated queue with transactions removed from other queues', () => {
			const { received, validated, ...otherQueues } = transactionPool.queues;
			const removedTransactions = Object.keys(otherQueues)
				.map(queueName => {
					const removedTransactions = [transactions[0]];
					(transactionPool.queues[queueName]
						.removeFor as sinon.SinonStub).returns(removedTransactions);
					return removedTransactions;
				})
				.reduce((acc, value) => acc.concat(value), []);
			transactionPool.onNewBlock(block);
			return expect(transactionPool.queues.validated.enqueueMany).to.be.calledWith([
				...removedTransactions,
				...removedTransactions,
			]);
		});
	});

	describe('#onRoundRollback', () => {
		const roundDelegateAddresses = addresses;

		it('should call checkTransactionForProperty with block sender addresses and "senderPublicKey" property', () => {
			transactionPool.onRoundRollback(roundDelegateAddresses);
			const senderProperty = 'senderPublicKey';
			return expect(
				stubs.checkTransactionPropertyForValues.calledWithExactly(
					roundDelegateAddresses,
					senderProperty,
				),
			).to.equal(true);
		});

		it('should call removeFor for pending, verified and ready queues once', () => {
			transactionPool.onRoundRollback(roundDelegateAddresses);
			const { pending, verified, ready } = transactionPool.queues;
			expect(pending.removeFor).to.be.calledOnce;
			expect(verified.removeFor).to.be.calledOnce;
			return expect(ready.removeFor).to.be.calledOnce;
		});

		it('should call enqueueMany for validated queue with transactions removed from other queues', () => {
			const { received, validated, ...otherQueues } = transactionPool.queues;
			const removedTransactions = Object.keys(otherQueues)
				.map(queueName => {
					const removedTransactions = [transactions[0]];
					(transactionPool.queues[queueName]
						.removeFor as sinon.SinonStub).returns(removedTransactions);
					return removedTransactions;
				})
				.reduce((acc, value) => acc.concat(value), []);
			transactionPool.onRoundRollback(roundDelegateAddresses);
			return expect(transactionPool.queues.validated.enqueueMany).to.be.calledWith(
				removedTransactions,
			);
		});
	});
});
