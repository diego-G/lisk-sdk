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
const blocksUtils = require('./utils');
const blocksLogic = require('./block');
const blockVersion = require('./block_version');
const transactionsModule = require('../transactions');

class BlocksProcess {
	constructor({
		blocksVerify,
		blocksChain,
		storage,
		exceptions,
		slots,
		interfaceAdapters,
		genesisBlock,
		blockReward,
		constants,
	}) {
		this.blocksVerify = blocksVerify;
		this.blocksChain = blocksChain;
		this.storage = storage;
		this.interfaceAdapters = interfaceAdapters;
		this.slots = slots;
		this.exceptions = exceptions;
		this.blockReward = blockReward;
		this.constants = constants;
		this.genesisBlock = genesisBlock;
	}

	async processBlock(block, lastBlock, broadcast) {
		const enhancedBlock = !broadcast
			? blocksUtils.addBlockProperties(block)
			: block;
		const normalizedBlock = blocksLogic.objectNormalize(
			enhancedBlock,
			this.exceptions
		);
		const { verified, errors } = this.blocksVerify.verifyBlock(
			normalizedBlock,
			lastBlock
		);
		if (!verified) {
			throw errors;
		}
		if (typeof broadcast === 'function') {
			broadcast(normalizedBlock);
		}
		await this.blocksVerify.checkExists(normalizedBlock);
		await this.blocksVerify.validateBlockSlot(normalizedBlock);
		await this.blocksVerify.checkTransactions(normalizedBlock);
		await this.blocksChain.applyBlock(normalizedBlock, true);
		return normalizedBlock;
	}

	async applyBlock(block, lastBlock) {
		const enhancedBlock = blocksUtils.addBlockProperties(block);
		const normalizedBlock = blocksLogic.objectNormalize(
			enhancedBlock,
			this.exceptions
		);
		const { verified, errors } = this.blocksVerify.verifyBlock(
			normalizedBlock,
			lastBlock
		);
		if (!verified) {
			throw errors;
		}
		await this.blocksVerify.validateBlockSlot(normalizedBlock);
		await this.blocksVerify.checkTransactions(normalizedBlock);
		await this.blocksChain.applyBlock(normalizedBlock, false);
		return normalizedBlock;
	}

	async generateBlock(lastBlock, keypair, timestamp, transactions) {
		const context = {
			blockTimestamp: timestamp,
			blockHeight: lastBlock.height + 1,
			blockVersion: blockVersion.currentBlockVersion,
		};

		const allowedTransactionsIds = transactionsModule
			.checkAllowedTransactions(context)(transactions)
			.transactionsResponses.filter(
				transactionResponse =>
					transactionResponse.status === TransactionStatus.OK
			)
			.map(transactionReponse => transactionReponse.id);

		const allowedTransactions = transactions.filter(transaction =>
			allowedTransactionsIds.includes(transaction.id)
		);
		const {
			transactionsResponses: responses,
		} = await transactionsModule.verifyTransactions(this.storage, this.slots)(
			allowedTransactions
		);
		const readyTransactions = transactions.filter(transaction =>
			responses
				.filter(response => response.status === TransactionStatus.OK)
				.map(response => response.id)
				.includes(transaction.id)
		);
		return blocksLogic.create({
			blockReward: this.blockReward,
			previousBlock: lastBlock,
			transactions: readyTransactions,
			maxPayloadLength: this.constants.maxPayloadLength,
			keypair,
			timestamp,
		});
	}

	async recoverInvalidOwnChain(lastBlock, onDelete) {
		const newLastBlock = await this.blocksChain.deleteLastBlock(lastBlock);
		onDelete(lastBlock, newLastBlock);
		const { verified } = this.blocksVerify.verifyBlock(lastBlock, newLastBlock);
		if (!verified) {
			await this.recoverInvalidOwnChain(newLastBlock, onDelete);
		}
		return newLastBlock;
	}

	async reload(targetHeight, isCleaning, onProgress, loadPerIteration = 1000) {
		await this.storage.entities.Account.resetMemTables();
		const lastBlock = await this._rebuild(
			0,
			targetHeight,
			isCleaning,
			onProgress,
			loadPerIteration
		);
		return lastBlock;
	}

	async _rebuild(
		currentHeight,
		targetHeight,
		isCleaning,
		onProgress,
		loadPerIteration
	) {
		const limit = loadPerIteration;
		const blocks = await blocksUtils.loadBlockBlocksWithOffset(
			this.storage,
			this.interfaceAdapters,
			this.genesisBlock,
			limit,
			currentHeight
		);
		let lastBlock;
		// eslint-disable-next-line no-restricted-syntax
		for (const block of blocks) {
			if (isCleaning()) {
				return lastBlock;
			}
			if (block.id === this.genesisBlock.id) {
				// eslint-disable-next-line no-await-in-loop
				lastBlock = await this.blocksChain.applyGenesisBlock(block);
				onProgress(lastBlock);
				// eslint-disable-next-line no-continue
				continue;
			}
			// eslint-disable-next-line no-await-in-loop
			lastBlock = await this.applyBlock(block, lastBlock);
			onProgress(lastBlock);
		}
		const nextHeight = currentHeight + limit;
		if (currentHeight <= targetHeight) {
			await this._rebuild(
				nextHeight,
				targetHeight,
				isCleaning,
				onProgress,
				loadPerIteration
			);
		}
		return lastBlock;
	}
}

module.exports = {
	BlocksProcess,
};
