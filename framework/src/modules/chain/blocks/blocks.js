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

const EventEmitter = require('events');
const { cloneDeep } = require('lodash');
const BigNum = require('@liskhq/bignum');
const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const {
	applyTransactions,
	checkPersistedTransactions,
	checkAllowedTransactions,
	validateTransactions,
} = require('../transactions');
const blocksUtils = require('./utils');
const {
	BlocksVerify,
	verifyBlockNotExists,
	verifyPreviousBlockId,
} = require('./verify');
const {
	applyConfirmedStep,
	applyConfirmedGenesisStep,
	deleteLastBlock,
	deleteFromBlockId,
	undoConfirmedStep,
	saveBlock,
} = require('./chain');
const {
	calculateSupply,
	calculateReward,
	calculateMilestone,
} = require('./block_reward');
const forkChoiceRule = require('./fork_choice_rule');
const {
	validateSignature,
	validatePreviousBlockProperty,
	validateReward,
	validatePayload,
	validateBlockSlot,
} = require('./validate');

const EVENT_NEW_BLOCK = 'EVENT_NEW_BLOCK';
const EVENT_DELETE_BLOCK = 'EVENT_DELETE_BLOCK';
const EVENT_BROADCAST_BLOCK = 'EVENT_BROADCAST_BLOCK';
const EVENT_NEW_BROADHASH = 'EVENT_NEW_BROADHASH';
const EVENT_PRIORITY_CHAIN_DETECTED = 'EVENT_PRIORITY_CHAIN_DETECTED';

class Blocks extends EventEmitter {
	constructor({
		// components
		logger,
		storage,
		// Unique requirements
		genesisBlock,
		slots,
		exceptions,
		// Modules
		interfaceAdapters,
		// constants
		blockReceiptTimeout, // set default
		loadPerIteration,
		maxPayloadLength,
		maxTransactionsPerBlock,
		activeDelegates,
		rewardDistance,
		rewardOffset,
		rewardMileStones,
		totalAmount,
		blockSlotWindow,
	}) {
		super();

		this._broadhash = genesisBlock.payloadHash;
		this._lastBlock = {};

		/**
		 * Represents the receipt time of the last block that was received
		 * from the network.
		 * TODO: Remove after fork.
		 * @type {number}
		 * @private
		 */

		this._cleaning = false;

		this.logger = logger;
		this.storage = storage;
		this.exceptions = exceptions;
		this.genesisBlock = genesisBlock;
		this.interfaceAdapters = interfaceAdapters;
		this.slots = slots;
		this.blockRewardArgs = {
			distance: rewardDistance,
			rewardOffset,
			milestones: rewardMileStones,
			totalAmount,
		};
		this.blockReward = {
			calculateMilestone: height =>
				calculateMilestone(height, this.blockRewardArgs),
			calculateReward: height => calculateReward(height, this.blockRewardArgs),
			calculateSupply: height => calculateSupply(height, this.blockRewardArgs),
		};
		this.constants = {
			blockReceiptTimeout,
			maxPayloadLength,
			maxTransactionsPerBlock,
			loadPerIteration,
			activeDelegates,
			blockSlotWindow,
		};

		this.blocksVerify = new BlocksVerify({
			storage: this.storage,
			exceptions: this.exceptions,
			slots: this.slots,
			genesisBlock: this.genesisBlock,
		});

		this.blocksUtils = blocksUtils;
	}

	get lastBlock() {
		// Remove receivedAt property..
		const { receivedAt, ...block } = this._lastBlock;
		return block;
	}

	async init() {
		// check mem tables
		const { genesisBlock } = await this.storage.entities.Block.begin(
			'loader:checkMemTables',
			async tx => blocksUtils.loadMemTables(this.storage, tx),
		);

		const genesisBlockMatch = this.blocksVerify.matchGenesisBlock(genesisBlock);

		if (!genesisBlockMatch) {
			throw new Error('Genesis block does not match');
		}

		// check if the round related information is in valid state
		await this.blocksVerify.reloadRequired();

		const [storageLastBlock] = await this.storage.entities.Block.get(
			{},
			{ sort: 'height:desc', limit: 1, extended: true },
		);
		if (!storageLastBlock) {
			throw new Error('Failed to load last block');
		}

		this._lastBlock = this.deserialize(storageLastBlock);
	}

	/**
	 * Serialize common properties to the JSON format
	 * @param {*} blockInstance Instance of the block
	 * @returns JSON format of the block
	 */
	// eslint-disable-next-line class-methods-use-this
	serialize(blockInstance) {
		const blockJSON = {
			...blockInstance,
			previousBlockId: blockInstance.previousBlock,
			totalAmount: blockInstance.totalAmount.toString(),
			totalFee: blockInstance.totalFee.toString(),
			reward: blockInstance.reward.toString(),
			transactions: blockInstance.transactions.map(tx => ({
				...tx.toJSON(),
				blockId: blockInstance.id,
			})),
		};
		delete blockJSON.previousBlock;
		return blockJSON;
	}

	/**
	 * Deserialize common properties to instance format
	 * @param {*} blockJSON JSON format of the block
	 */
	deserialize(blockJSON) {
		const transactions = (blockJSON.transactions || []).map(transaction =>
			this.interfaceAdapters.transactions.fromJson(transaction),
		);
		const blockInstance = {
			...blockJSON,
			totalAmount: new BigNum(blockJSON.totalAmount || 0),
			totalFee: new BigNum(blockJSON.totalFee || 0),
			reward: new BigNum(blockJSON.reward || 0),
			// Remove this inconsistency after #4295
			previousBlock: blockJSON.previousBlock || blockJSON.previousBlockId,
			version:
				blockJSON.version === undefined || blockJSON.version === null
					? 0
					: blockJSON.version,
			numberOfTransactions: transactions.length,
			payloadLength:
				blockJSON.payloadLength === undefined ||
				blockJSON.payloadLength === null
					? 0
					: blockJSON.payloadLength,
			transactions,
		};
		delete blockInstance.previousBlockId;
		return blockInstance;
	}

	async validateDetached({ block, blockBytes }) {
		return this._validateDetached({ block, blockBytes });
	}

	async _validateDetached({ block, blockBytes }) {
		validatePreviousBlockProperty(block, this.genesisBlock);
		validateSignature(block, blockBytes);
		validateReward(block, this.blockReward, this.exceptions);

		// validate transactions
		const { transactionsResponses } = validateTransactions(this.exceptions)(
			block.transactions,
		);
		const invalidTransactionResponse = transactionsResponses.find(
			transactionResponse =>
				transactionResponse.status !== TransactionStatus.OK,
		);

		if (invalidTransactionResponse) {
			throw invalidTransactionResponse.errors;
		}
		validatePayload(
			block,
			this.constants.maxTransactionsPerBlock,
			this.constants.maxPayloadLength,
		);
		// Update id
		block.id = blocksUtils.getId(blockBytes);
	}

	async verifyInMemory({ block, lastBlock }) {
		verifyPreviousBlockId(block, lastBlock, this.genesisBlock);
		validateBlockSlot(block, lastBlock, this.slots);
	}

	forkChoice({ block, lastBlock }) {
		// Current time since Lisk Epoch
		block.receivedAt = this.slots.getEpochTime();
		// Cases are numbered following LIP-0014 Fork choice rule.
		// See: https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#applying-blocks-according-to-fork-choice-rule
		// Case 2 and 1 have flipped execution order for better readability. Behavior is still the same

		if (forkChoiceRule.isValidBlock(lastBlock, block)) {
			// Case 2: correct block received
			return forkChoiceRule.FORK_STATUS_VALID_BLOCK;
		}

		if (forkChoiceRule.isIdenticalBlock(lastBlock, block)) {
			// Case 1: same block received twice
			return forkChoiceRule.FORK_STATUS_IDENTICAL_BLOCK;
		}

		if (forkChoiceRule.isDoubleForging(lastBlock, block)) {
			// Delegates are the same
			// Case 3: double forging different blocks in the same slot.
			// Last Block stands.
			return forkChoiceRule.FORK_STATUS_DOUBLE_FORGING;
		}

		if (
			forkChoiceRule.isTieBreak({
				slots: this.slots,
				lastAppliedBlock: lastBlock,
				receivedBlock: block,
			})
		) {
			// Two competing blocks by different delegates at the same height.
			// Case 4: Tie break
			return forkChoiceRule.FORK_STATUS_TIE_BREAK;
		}

		if (forkChoiceRule.isDifferentChain(lastBlock, block)) {
			// Case 5: received block has priority. Move to a different chain.
			return forkChoiceRule.FORK_STATUS_DIFFERENT_CHAIN;
		}

		// Discard newly received block
		return forkChoiceRule.FORK_STATUS_DISCARD;
	}

	async verify({ block, skipExistingCheck }) {
		if (skipExistingCheck !== true) {
			await verifyBlockNotExists(this.storage, block);
			const {
				transactionsResponses: persistedResponse,
			} = await checkPersistedTransactions(this.storage)(block.transactions);
			const invalidPersistedResponse = persistedResponse.find(
				transactionResponse =>
					transactionResponse.status !== TransactionStatus.OK,
			);
			if (invalidPersistedResponse) {
				throw invalidPersistedResponse.errors;
			}
		}
		await this.blocksVerify.checkTransactions(block);
	}

	async apply({ block, tx }) {
		await applyConfirmedStep(
			this.storage,
			this.slots,
			block,
			this.exceptions,
			tx,
		);

		this._lastBlock = block;
	}

	async applyGenesis({ block, tx }) {
		await applyConfirmedGenesisStep(
			this.storage,
			this.slots,
			block,
			this.exceptions,
			tx,
		);

		this._lastBlock = block;
	}

	async save({ blockJSON, tx }) {
		await saveBlock(this.storage, blockJSON, tx);
	}

	async undo({ block, tx }) {
		await undoConfirmedStep(
			this.storage,
			this.slots,
			block,
			this.exceptions,
			tx,
		);
	}

	async remove({ block, blockJSON, tx }, saveTempBlock = false) {
		const storageRowOfBlock = await deleteLastBlock(this.storage, block, tx);
		const secondLastBlock = this.deserialize(storageRowOfBlock);

		if (saveTempBlock) {
			const blockTempEntry = {
				id: blockJSON.id,
				height: blockJSON.height,
				fullBlock: blockJSON,
			};
			await this.storage.entities.TempBlock.create(blockTempEntry, {}, tx);
		}
		this._lastBlock = secondLastBlock;
	}

	/**
	 * Remove one block from temp_block table
	 * @param {string} blockId
	 * @param {Object} tx - database transaction
	 */
	async removeBlockFromTempTable(blockId, tx) {
		return this.storage.entities.TempBlock.delete({ id: blockId }, {}, tx);
	}

	/**
	 * Get all blocks from temp_block table
	 * @param {Object} tx - database transaction
	 */
	async getTempBlocks(tx) {
		return this.storage.entities.TempBlock.get({}, {}, tx);
	}

	async exists(block) {
		try {
			await verifyBlockNotExists(this.storage, block);
			return false;
		} catch (err) {
			return true;
		}
	}

	async deleteAfter(block) {
		return deleteFromBlockId(this.storage, block.id);
	}

	async getJSONBlocksWithLimitAndOffset(limit, offset = 0) {
		// Calculate toHeight
		const toHeight = offset + limit;

		const filters = {
			height_gte: offset,
			height_lt: toHeight,
		};

		const options = {
			limit: null,
			sort: ['height:asc', 'rowId:asc'],
			extended: true,
		};

		// Loads extended blocks from storage
		return this.storage.entities.Block.get(filters, options);
	}

	// TODO: Unit tests written in mocha, which should be migrated to jest.
	async filterReadyTransactions(transactions, context) {
		const allowedTransactionsIds = checkAllowedTransactions(context)(
			transactions,
		)
			.transactionsResponses.filter(
				transactionResponse =>
					transactionResponse.status === TransactionStatus.OK,
			)
			.map(transactionReponse => transactionReponse.id);

		const allowedTransactions = transactions.filter(transaction =>
			allowedTransactionsIds.includes(transaction.id),
		);
		const { transactionsResponses: responses } = await applyTransactions(
			this.storage,
			this.slots,
		)(allowedTransactions);
		const readyTransactions = allowedTransactions.filter(transaction =>
			responses
				.filter(response => response.status === TransactionStatus.OK)
				.map(response => response.id)
				.includes(transaction.id),
		);
		return readyTransactions;
	}

	broadcast(block) {
		// emit event
		const cloned = cloneDeep(block);
		this.emit(EVENT_BROADCAST_BLOCK, { block: cloned });
	}

	/**
	 * Handle node shutdown request.
	 *
	 * @listens module:app~event:cleanup
	 * @param {function} cb - Callback function
	 * @returns {setImmediateCallback} cb
	 */
	async cleanup() {
		this._cleaning = true;
		if (!this._isActive) {
			// Module ready for shutdown
			return;
		}

		const waitFor = () =>
			new Promise(resolve => {
				setTimeout(resolve, 10000);
			});
		// Module is not ready, repeat
		const nextWatch = async () => {
			if (this._isActive) {
				this.logger.info('Waiting for block processing to finish...');
				await waitFor();
				await nextWatch();
			}

			return null;
		};
		await nextWatch();
	}

	async loadBlocksFromLastBlockId(lastBlockId, limit = 1) {
		return blocksUtils.loadBlocksFromLastBlockId(
			this.storage,
			lastBlockId,
			limit,
		);
	}

	/**
	 * Returns the highest common block between ids and the database blocks table
	 * @param {Array<String>} ids - An array of block ids
	 * @return {Promise<BasicBlock|undefined>}
	 */
	// TODO: Unit tests written in mocha, which should be migrated to jest.
	async getHighestCommonBlock(ids) {
		try {
			const [block] = await this.storage.entities.Block.get(
				{
					id_in: ids,
				},
				{ sort: 'height:desc', limit: 1 },
			);
			return block;
		} catch (e) {
			const errMessage = 'Failed to access storage layer';
			this.logger.error({ err: e }, errMessage);
			throw new Error(errMessage);
		}
	}

	// TODO: Remove it later
	async _updateBroadhash() {
		const { broadhash, height } = await blocksUtils.calculateNewBroadhash(
			this.storage,
			this._broadhash,
			this._lastBlock.height,
		);
		this._broadhash = broadhash;
		this.emit(EVENT_NEW_BROADHASH, { broadhash, height });
	}
}

module.exports = {
	Blocks,
	EVENT_NEW_BLOCK,
	EVENT_DELETE_BLOCK,
	EVENT_BROADCAST_BLOCK,
	EVENT_NEW_BROADHASH,
	EVENT_PRIORITY_CHAIN_DETECTED,
};
