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

const { TransactionError } = require('@liskhq/lisk-transactions');
const { validator } = require('@liskhq/lisk-validator');
const { convertErrorsToString } = require('../utils/error_handlers');
const { InvalidTransactionError } = require('./errors');
const Broadcaster = require('./broadcaster');
const schemas = require('./schemas');

const DEFAULT_RATE_RESET_TIME = 10000;
const DEFAULT_RATE_LIMIT_FREQUENCY = 3;

/**
 * Main transport methods. Initializes library with scope content and generates a Broadcaster instance.
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires async
 * @requires api/ws/rpc/failure_codes
 * @requires api/ws/rpc/failure_codes
 * @requires api/ws/workers/rules
 * @requires api/ws/rpc/ws_rpc
 * @requires logic/broadcaster
 * @param {scope} scope - App instance
 */
class Transport {
	constructor({
		// components
		channel,
		logger,
		storage,
		// Unique requirements
		applicationState,
		exceptions,
		// Modules
		synchronizer,
		transactionPoolModule,
		blocksModule,
		processorModule,
		// Constants
		broadcasts,
	}) {
		this.message = {};

		this.channel = channel;
		this.logger = logger;
		this.storage = storage;
		this.synchronizer = synchronizer;
		this.applicationState = applicationState;
		this.exceptions = exceptions;

		this.constants = {
			broadcasts,
		};

		this.transactionPoolModule = transactionPoolModule;
		this.blocksModule = blocksModule;
		this.processorModule = processorModule;

		this.broadcaster = new Broadcaster({
			broadcasts: this.constants.broadcasts,
			transactionPool: this.transactionPoolModule,
			logger: this.logger,
			channel: this.channel,
			storage: this.storage,
		});

		// Rate limit for certain endpoints
		this.rateTracker = {};
		setInterval(() => {
			this.rateTracker = {};
		}, DEFAULT_RATE_RESET_TIME);
	}

	/**
	 * Calls enqueue signatures and emits a 'signature/change' socket message.
	 *
	 * @param {signature} signature
	 * @param {Object} broadcast
	 * @emits signature/change
	 * @todo Add description for the params
	 */
	handleBroadcastSignature(signature) {
		this.broadcaster.enqueueSignatureObject(signature);
		this.channel.publish('chain:signature:change', signature);
	}

	/**
	 * Calls enqueue transactions and emits a 'transactions/change' socket message.
	 *
	 * @param {transaction} transaction
	 * @param {Object} broadcast
	 * @emits transactions/change
	 * @todo Add description for the params
	 */
	handleBroadcastTransaction(transaction) {
		this.broadcaster.enqueueTransactionId(transaction.id);
		this.channel.publish('chain:transactions:change', transaction.toJSON());
	}

	/**
	 * Calls broadcast blocks and emits a 'blocks/change' socket message.
	 *
	 * @param {Object} block - Reduced block object
	 * @param {boolean} broadcast - Signal flag for broadcast
	 * @emits blocks/change
	 */
	async handleBroadcastBlock(blockJSON) {
		if (this.synchronizer.isActive) {
			this.logger.debug(
				'Transport->onBroadcastBlock: Aborted - blockchain synchronization in progress',
			);
			return null;
		}
		return this.channel.invoke('network:send', {
			event: 'postBlock',
			data: {
				block: blockJSON,
			},
		});
	}

	/**
	 * @property {function} blocks
	 * @property {function} postBlock
	 * @property {function} list
	 * @property {function} height
	 * @property {function} status
	 * @property {function} postSignatures
	 * @property {function} getSignatures
	 * @property {function} getTransactions
	 * @property {function} postTransactionsAnnouncement
	 * @todo Add description for the functions
	 * @todo Implement API comments with apidoc.
	 * @see {@link http://apidocjs.com/}
	 */

	/**
	 * Returns a set of full blocks starting from the ID defined in the data up to
	 * the current tip of the chain.
	 * @param {object} data
	 * @param {string} data.blockId - The ID of the starting block
	 * @return {Promise<Array<object>>}
	 */
	async handleRPCGetBlocksFromId(data, peerId) {
		validator.validate(schemas.getBlocksFromIdRequest, data);

		if (validator.validator.errors) {
			this.logger.warn(
				{
					err: validator.validator.errors,
					req: data,
				},
				'getBlocksFromID request validation failed',
			);
			await this.channel.invoke('network:applyPenalty', {
				peerId,
				penalty: 100,
			});
			throw validator.validator.errors;
		}

		return this.blocksModule.loadBlocksFromLastBlockId(data.blockId, 34);
	}

	async handleRPCGetGetHighestCommonBlock(data, peerId) {
		const valid = validator.validate(
			schemas.getHighestCommonBlockRequest,
			data,
		);

		if (valid.length) {
			const err = valid;
			const error = `${err[0].message}: ${err[0].path}`;
			this.logger.warn(
				{
					err: error,
					req: data,
				},
				'getHighestCommonBlock request validation failed',
			);
			await this.channel.invoke('network:applyPenalty', {
				peerId,
				penalty: 100,
			});
			throw new Error(error);
		}

		const commonBlock = await this.blocksModule.getHighestCommonBlock(data.ids);

		return commonBlock;
	}

	/**
	 * Description of postBlock.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async handleEventPostBlock(data, peerId) {
		if (!this.constants.broadcasts.active) {
			return this.logger.debug(
				'Receiving blocks disabled by user through config.json',
			);
		}

		// Should ignore received block if syncing
		if (this.synchronizer.isActive) {
			return this.logger.debug(
				{ blockId: data.block.id, height: data.block.height },
				"Client is syncing. Can't process new block at the moment.",
			);
		}

		const errors = validator.validate(schemas.postBlockEvent, data);

		if (errors.length) {
			this.logger.warn(
				{
					errors,
					module: 'transport',
					data,
				},
				'Received post block broadcast request in unexpected format',
			);
			await this.channel.invoke('network:applyPenalty', {
				peerId,
				penalty: 100,
			});
			throw errors;
		}

		const block = await this.processorModule.deserialize(data.block);

		return this.processorModule.process(block, { peerId });
	}

	/**
	 * Description of postSignature.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async handleEventPostSignature(data) {
		const errors = validator.validate(schemas.signatureObject, data.signature);

		if (errors.length) {
			const error = new TransactionError(errors[0].message);
			return {
				code: 400,
				errors: [error],
			};
		}

		try {
			await this.transactionPoolModule.getTransactionAndProcessSignature(
				data.signature,
			);
			return {};
		} catch (err) {
			return {
				code: 409,
				errors: err,
			};
		}
	}

	/**
	 * Description of postSignatures.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async handleEventPostSignatures(data, peerId) {
		await this._addRateLimit(
			'postSignatures',
			peerId,
			DEFAULT_RATE_LIMIT_FREQUENCY,
		);
		const errors = validator.validate(schemas.postSignatureEvent, data);

		if (errors.length) {
			this.logger.warn({ err: errors }, 'Invalid signatures body');
			await this.channel.invoke('network:applyPenalty', {
				peerId,
				penalty: 100,
			});
			throw errors;
		}

		for (const signature of data.signatures) {
			const signatureObjectErrors = validator.validate(
				schemas.signatureObject,
				signature,
			);

			if (signatureObjectErrors.length) {
				await this.channel.invoke('network:applyPenalty', {
					peerId,
					penalty: 100,
				});
				throw signatureObjectErrors;
			}

			await this.transactionPoolModule.getTransactionAndProcessSignature(
				signature,
			);
		}
	}

	/**
	 * Description of getSignatures.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async handleRPCGetSignatures() {
		const transactions = this.transactionPoolModule.getMultisignatureTransactionList(
			true,
			this.constants.broadcasts.releaseLimit,
		);

		const signatures = transactions
			.filter(
				transaction => transaction.signatures && transaction.signatures.length,
			)
			.map(transaction => ({
				transaction: transaction.id,
				signatures: transaction.signatures,
			}));

		return {
			signatures,
		};
	}

	/**
	 * Get default number of transactions or by ids.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async handleRPCGetTransactions(data = {}, peerId) {
		await this._addRateLimit(
			'getTransactions',
			peerId,
			DEFAULT_RATE_LIMIT_FREQUENCY,
		);
		const errors = validator.validate(schemas.getTransactionsRequest, data);
		if (errors.length) {
			this.logger.warn(
				{ err: errors, peerId },
				'Received invalid transactions body',
			);
			await this.channel.invoke('network:applyPenalty', {
				peerId,
				penalty: 100,
			});
			throw errors;
		}

		const { transactionIds } = data;
		if (!transactionIds) {
			return {
				transactions: this.transactionPoolModule.getMergedTransactionList(
					true,
					this.constants.broadcasts.releaseLimit,
				),
			};
		}

		if (transactionIds.length > this.constants.broadcasts.releaseLimit) {
			const error = new Error('Received invalid request.');
			this.logger.warn({ err: error, peerId }, 'Received invalid request.');
			await this.channel.invoke('network:applyPenalty', {
				peerId,
				penalty: 100,
			});
			throw error;
		}

		const transactionsFromQueues = [];
		const idsNotInPool = [];

		for (const id of transactionIds) {
			// Check if any transaction is in the queues.
			const transactionInPool = this.transactionPoolModule.findInTransactionPool(
				id,
			);

			if (transactionInPool) {
				transactionsFromQueues.push(transactionInPool.toJSON());
			} else {
				idsNotInPool.push(id);
			}
		}

		if (idsNotInPool.length) {
			// Check if any transaction that was not in the queues, is in the database instead.
			const transactionsFromDatabase = await this.storage.entities.Transaction.get(
				{ id_in: idsNotInPool },
				{ limit: this.constants.broadcasts.releaseLimit },
			);

			return {
				transactions: transactionsFromQueues.concat(transactionsFromDatabase),
			};
		}

		return {
			transactions: transactionsFromQueues,
		};
	}

	/**
	 * Description of postTransaction.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async handleEventPostTransaction(data) {
		try {
			const id = await this._receiveTransaction(data.transaction);
			return {
				transactionId: id,
			};
		} catch (err) {
			return {
				message: err.message || 'Transaction was rejected with errors',
				errors: err,
			};
		}
	}

	/**
	 * Process transactions IDs announcement. First validates, filter the known transactions
	 * and finally ask to the emitter the ones that are unknown.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async handleEventPostTransactionsAnnouncement(data, peerId) {
		await this._addRateLimit(
			'postTransactionsAnnouncement',
			peerId,
			DEFAULT_RATE_LIMIT_FREQUENCY,
		);
		const errors = validator.validate(
			schemas.postTransactionsAnnouncementEvent,
			data,
		);

		if (errors.length) {
			this.logger.warn(
				{ err: errors, peerId },
				'Received invalid transactions body',
			);
			await this.channel.invoke('network:applyPenalty', {
				peerId,
				penalty: 100,
			});
			throw errors;
		}

		const unknownTransactionIDs = await this._obtainUnknownTransactionIDs(
			data.transactionIds,
		);
		if (unknownTransactionIDs.length > 0) {
			const { data: result } = await this.channel.invoke(
				'network:requestFromPeer',
				{
					procedure: 'getTransactions',
					data: { transactionIds: unknownTransactionIDs },
					peerId,
				},
			);
			try {
				for (const transaction of result.transactions) {
					transaction.bundled = true;
					await this._receiveTransaction(transaction);
				}
			} catch (err) {
				this.logger.warn({ err, peerId }, 'Received invalid transactions.');
				if (err instanceof InvalidTransactionError) {
					await this.channel.invoke('network:applyPenalty', {
						peerId,
						penalty: 100,
					});
				}
			}
		}

		return null;
	}

	/**
	 * It filters the known transaction IDs because they are either in the queues or exist in the database.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	async _obtainUnknownTransactionIDs(ids) {
		// Check if any transaction is in the queues.
		const unknownTransactionsIDs = ids.filter(
			id => !this.transactionPoolModule.transactionInPool(id),
		);

		if (unknownTransactionsIDs.length) {
			// Check if any transaction exists in the database.
			const existingTransactions = await this.storage.entities.Transaction.get(
				{
					id_in: unknownTransactionsIDs,
				},
				{
					limit: this.constants.broadcasts.releaseLimit,
				},
			);

			return unknownTransactionsIDs.filter(
				id =>
					existingTransactions.find(
						existingTransaction => existingTransaction.id === id,
					) === undefined,
			);
		}

		return unknownTransactionsIDs;
	}

	/**
	 * Normalizes transaction
	 * processUnconfirmedTransaction to confirm it.
	 *
	 * @private
	 * @param {transaction} transaction
	 * @returns {Promise.<boolean, Error>}
	 * @todo Add description for the params
	 */
	async _receiveTransaction(transactionJSON) {
		const id = transactionJSON ? transactionJSON.id : 'null';
		let transaction;
		try {
			transaction = this.blocksModule.deserializeTransaction(transactionJSON);

			// Composed transaction checks are all static, so it does not need state store
			const {
				transactionsResponses,
			} = await this.blocksModule.validateTransactions([transaction]);

			if (transactionsResponses[0].errors.length > 0) {
				throw transactionsResponses[0].errors;
			}
		} catch (errors) {
			const errString = convertErrorsToString(errors);
			const err = new InvalidTransactionError(errString, id);
			this.logger.error(
				{
					err,
					module: 'transport',
				},
				'Transaction normalization failed',
			);

			throw err;
		}

		this.logger.debug({ id: transaction.id }, 'Received transaction');

		try {
			await this.transactionPoolModule.processUnconfirmedTransaction(
				transaction,
				true,
			);
			return transaction.id;
		} catch (err) {
			this.logger.debug(`Transaction ${id}`, convertErrorsToString(err));
			if (transaction) {
				this.logger.debug({ transaction }, 'Transaction');
			}
			throw err;
		}
	}

	async _addRateLimit(procedure, peerId, limit) {
		if (this.rateTracker[procedure] === undefined) {
			this.rateTracker[procedure] = { [peerId]: 0 };
		}
		this.rateTracker[procedure][peerId] = this.rateTracker[procedure][peerId]
			? this.rateTracker[procedure][peerId] + 1
			: 1;
		if (this.rateTracker[procedure][peerId] > limit) {
			await this.channel.invoke('network:applyPenalty', {
				peerId,
				penalty: 10,
			});
		}
	}
}

// Export
module.exports = { Transport };
