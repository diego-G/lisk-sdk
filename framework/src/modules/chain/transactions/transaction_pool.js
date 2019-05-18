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

const pool = require('@liskhq/lisk-transaction-pool');
const {
	Status: TransactionStatus,
	TransactionError,
} = require('@liskhq/lisk-transactions');
const { composeTransactionSteps } = require('./compose_transaction_steps');

const wrapAddTransactionResponseInCb = (
	addTransactionResponse,
	cb,
	transaction,
	err
) => {
	if (err) {
		return cb(err);
	}
	if (addTransactionResponse.isFull) {
		return cb(new Error('Transaction pool is full'));
	}
	if (addTransactionResponse.alreadyExists) {
		if (addTransactionResponse.queueName === readyQueue) {
			return cb(new Error('Transaction is already in unconfirmed state'));
		}
		return cb(new Error(`Transaction is already processed: ${transaction.id}`));
	}
	return cb();
};

const receivedQueue = 'recieved';
// TODO: Need to decide which queue will include transactions in the validated queue
// const validatedQueue = 'validated';
const pendingQueue = 'pending';
const verifiedQueue = 'verified';
const readyQueue = 'ready';

/**
 * Transaction pool logic. Initializes variables,
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires async
 * @param {number} broadcastInterval - Broadcast interval in seconds, used for bundling
 * @param {number} releaseLimit - Release limit for transactions broadcasts, used for bundling
 * @param {Object} logger - Logger instance
 * @param {Object} config - config variable
 */
class TransactionPool {
	constructor({
		transactions,
		slots,
		logger,
		broadcastInterval,
		releaseLimit,
		expireTransactionsInterval,
		maxSharedTransactions,
		maxTransactionsPerQueue,
		maxTransactionsPerBlock,
	}) {
		this.transactions = transactions;
		this.logger = logger;
		this.slots = slots;
		this.expireTransactionsInterval = expireTransactionsInterval;
		this.maxTransactionsPerQueue = maxTransactionsPerQueue;
		this.maxTransactionsPerBlock = maxTransactionsPerBlock;
		this.maxSharedTransactions = maxSharedTransactions;
		this.bundledInterval = broadcastInterval;
		this.bundleLimit = releaseLimit;

		this.validateTransactions = transactions.validateTransactions;
		this.verifyTransactions = composeTransactionSteps(
			transactions.checkAllowedTransactions,
			transactions.checkPersistedTransactions,
			transactions.verifyTransactions
		);
		this.processTransactions = composeTransactionSteps(
			transactions.checkPersistedTransactions,
			transactions.applyTransactions
		);

		const poolConfig = {
			expireTransactionsInterval: this.expireTransactionsInterval,
			maxTransactionsPerQueue: this.maxTransactionsPerQueue,
			receivedTransactionsLimitPerProcessing: this.bundleLimit,
			receivedTransactionsProcessingInterval: this.bundledInterval,
			validatedTransactionsLimitPerProcessing: this.bundleLimit,
			validatedTransactionsProcessingInterval: this.bundledInterval,
			verifiedTransactionsLimitPerProcessing: this.maxTransactionsPerBlock,
			verifiedTransactionsProcessingInterval: this.bundledInterval,
			pendingTransactionsProcessingLimit: this.maxTransactionsPerBlock,
		};

		const poolDependencies = {
			validateTransactions: this.validateTransactions,
			verifyTransactions: this.verifyTransactions,
			processTransactions: this.processTransactions,
		};

		this.pool = new pool.TransactionPool({
			...poolConfig,
			...poolDependencies,
		});

		this.subscribeEvents();
	}

	resetPool() {
		const poolConfig = {
			expireTransactionsInterval: this.expireTransactionsInterval,
			maxTransactionsPerQueue: this.maxTransactionsPerQueue,
			receivedTransactionsLimitPerProcessing: this.bundleLimit,
			receivedTransactionsProcessingInterval: this.bundledInterval,
			validatedTransactionsLimitPerProcessing: this.bundleLimit,
			validatedTransactionsProcessingInterval: this.bundledInterval,
			verifiedTransactionsLimitPerProcessing: this.maxTransactionsPerBlock,
			verifiedTransactionsProcessingInterval: this.bundledInterval,
			pendingTransactionsProcessingLimit: this.maxTransactionsPerBlock,
		};

		const poolDependencies = {
			validateTransactions: this.validateTransactions,
			verifyTransactions: this.verifyTransactions,
			processTransactions: this.processTransactions,
		};

		this.pool = new pool.TransactionPool({
			...poolConfig,
			...poolDependencies,
		});

		this.subscribeEvents();
	}

	subscribeEvents() {
		this.pool.on(pool.EVENT_ADDED_TRANSACTIONS, ({ action, to, payload }) => {
			if (payload.length > 0) {
				if (action === pool.ACTION_ADD_TRANSACTIONS) {
					payload.forEach(aTransaction =>
						this.bus.message('unconfirmedTransaction', aTransaction, true)
					);
				}

				this.logger.info(
					`Transaction pool - added transactions ${
						to ? `to ${to} queue` : ''
					} on action: ${action} with ID(s): ${payload.map(
						transaction => transaction.id
					)}`
				);
			}
		});
		this.pool.on(pool.EVENT_REMOVED_TRANSACTIONS, ({ action, payload }) => {
			if (payload.length > 0) {
				this.logger.info(
					`Transaction pool - removed transactions on action: ${action} with ID(s): ${payload.map(
						transaction => transaction.id
					)}`
				);
			}
			const queueSizes = Object.keys(this.pool._queues)
				.map(
					queueName =>
						`${queueName} size: ${this.pool._queues[queueName].size()}`
				)
				.join(' ');
			this.logger.info(`Transaction pool - ${queueSizes}`);
		});
	}

	async getTransactionAndProcessSignature(signature) {
		if (!signature) {
			const message = 'Unable to process signature, signature not provided';
			this.logger.error(message);
			throw new TransactionError(message, '', '.signature');
		}
		// Grab transaction with corresponding ID from transaction pool
		const transaction = this.getMultisignatureTransaction(
			signature.transactionId
		);

		if (!transaction) {
			const message =
				'Unable to process signature, corresponding transaction not found';
			this.logger.error(message, { signature });
			throw new TransactionError(message, '', '.signature');
		}

		const transactionResponse = await this.transactions.processSignature(
			transaction,
			signature
		);
		if (
			transactionResponse.status === TransactionStatus.FAIL &&
			transactionResponse.errors.length > 0
		) {
			const message = transactionResponse.errors[0].message;
			this.logger.error(message, { signature });
			throw transactionResponse.errors;
		}
		return transactionResponse;
	}

	transactionInPool(id) {
		return this.pool.existsInTransactionPool(id);
	}

	getMultisignatureTransaction(id) {
		return this.pool.queues[pendingQueue].index[id];
	}

	/**
	 * Gets unconfirmed transactions based on limit and reverse option.
	 *
	 * @param {boolean} reverse - Reverse order of results
	 * @param {number} limit - Limit applied to results
	 * @returns {Object[]} Of bundled transactions
	 */
	getUnconfirmedTransactionList(reverse, limit) {
		return this.getTransactionsList(readyQueue, reverse, limit);
	}

	/**
	 * Gets bundled transactions based on limit and reverse option.
	 *
	 * @param {boolean} reverse - Reverse order of results
	 * @param {number} limit - Limit applied to results
	 * @returns {Object[]} Of bundled transactions
	 */
	getBundledTransactionList(reverse, limit) {
		return this.getTransactionsList(receivedQueue, reverse, limit);
	}

	/**
	 * Gets queued transactions based on limit and reverse option.
	 *
	 * @param {boolean} reverse - Reverse order of results
	 * @param {number} limit - Limit applied to results
	 * @returns {Object[]} Of bundled transactions
	 */
	getQueuedTransactionList(reverse, limit) {
		return this.getTransactionsList(verifiedQueue, reverse, limit);
	}

	/**
	 * Gets multisignature transactions based on limit and reverse option.
	 *
	 * @param {boolean} reverse - Reverse order of results
	 * @param {number} limit - Limit applied to results
	 * @param {boolean} ready - Limits results to transactions deemed "ready"
	 * @returns {Object[]} Of multisignature transactions
	 */
	getMultisignatureTransactionList(reverse, limit, ready) {
		if (ready) {
			return this.getTransactionsList(pendingQueue, reverse).filter(
				transaction => transaction.ready
			);
		}
		return this.getTransactionsList(pendingQueue, reverse, limit);
	}

	getCountByQueue(queueName) {
		return this.pool.queues[queueName].size();
	}

	getTransactionsList(queueName, reverse, limit) {
		const transactions = this.pool.queues[queueName].transactions;
		let transactionList = [...transactions];

		transactionList = reverse ? transactionList.reverse() : transactionList;

		if (limit) {
			transactionList.splice(limit);
		}

		return transactionList;
	}

	async fillPool() {
		await this.pool.validateReceivedTransactions();
		await this.pool.verifyValidatedTransactions();
		await this.pool.processVerifiedTransactions();
	}

	/**
	 * Gets unconfirmed, multisignature and queued transactions based on limit and reverse option.
	 *
	 * @param {boolean} reverse - Reverse order of results
	 * @param {number} limit - Limit applied to results
	 * @returns {Object[]} Of unconfirmed, multisignatures, queued transactions
	 * @todo Limit is only implemented with queued transactions, reverse param is unused
	 */
	getMergedTransactionList(
		reverse = false,
		limit = this.maxSharedTransactions
	) {
		if (limit > this.maxSharedTransactions) {
			limit = this.maxSharedTransactions;
		}

		const ready = this.getUnconfirmedTransactionList(
			reverse,
			Math.min(this.maxTransactionsPerBlock, limit)
		);
		limit -= ready.length;
		const pending = this.getMultisignatureTransactionList(
			reverse,
			Math.min(this.maxTransactionsPerBlock, limit)
		);
		limit -= pending.length;
		const verified = this.getQueuedTransactionList(reverse, limit);
		limit -= verified.length;

		return [...ready, ...pending, ...verified];
	}

	addBundledTransaction(transaction, cb) {
		return wrapAddTransactionResponseInCb(
			this.pool.addTransaction(transaction),
			cb,
			transaction
		);
		// Register to braodcaster
	}

	addVerifiedTransaction(transaction, cb) {
		return wrapAddTransactionResponseInCb(
			this.pool.addVerifiedTransaction(transaction),
			cb,
			transaction
		);
		// Register to braodcaster
	}

	addMultisignatureTransaction(transaction, cb) {
		return wrapAddTransactionResponseInCb(
			this.pool.addPendingTransaction(transaction),
			cb,
			transaction
		);
		// Register to braodcaster
	}

	processUnconfirmedTransaction(transaction, broadcast, cb) {
		if (this.transactionInPool(transaction.id)) {
			return setImmediate(cb, [
				new TransactionError(
					`Transaction is already processed: ${transaction.id}`,
					transaction.id,
					'.id'
				),
			]);
		}

		if (
			this.slots.getSlotNumber(transaction.timestamp) >
			this.slots.getSlotNumber()
		) {
			return setImmediate(cb, [
				new TransactionError(
					'Invalid transaction timestamp. Timestamp is in the future',
					transaction.id,
					'.timestamp'
				),
			]);
		}

		return this.verifyTransactions([transaction]).then(
			({ transactionsResponses }) => {
				if (transactionsResponses[0].status === TransactionStatus.OK) {
					return this.addVerifiedTransaction(transaction, cb);
				}
				if (transactionsResponses[0].status === TransactionStatus.PENDING) {
					return this.addMultisignatureTransaction(transaction, cb);
				}
				this.logger.info(
					`Transaction pool - ${transactionsResponses[0].errors}`
				);
				return cb(transactionsResponses[0].errors);
			}
		);
		// Register to braodcaster
	}

	onConfirmedTransactions(transactions) {
		this.pool.removeConfirmedTransactions(transactions);
	}

	onDeletedTransactions(transactions) {
		this.pool.addVerifiedRemovedTransactions(transactions);
	}
}

module.exports = { TransactionPool };
