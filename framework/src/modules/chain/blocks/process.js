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
const blocksVerify = require('./verify');
const blocksChain = require('./chain');
const blocksUtils = require('./utils');
const blocksLogic = require('./block');
const blockVersion = require('./block_version');
const transactionsModule = require('../transactions');

/**
 * Apply and save block
 *
 * @param {number} blocksAmount - Amount of blocks
 * @param {number} fromHeight - Height to start at
 * @returns {Block} applied block
 */
const processBlock = async ({
	block,
	lastBlock,
	broadcast,
	storage,
	exceptions,
	slots,
	delegatesModule,
	roundsModule,
	maxTransactionsPerBlock,
	maxPayloadLength,
	blockRewards,
}) => {
	const enhancedBlock = !broadcast
		? blocksUtils.addBlockProperties(block)
		: block;
	const normalizedBlock = blocksLogic.objectNormalize(
		enhancedBlock,
		exceptions
	);
	const { verified, errors } = blocksVerify.verifyBlock({
		slots,
		delegatesModule,
		maxTransactionsPerBlock,
		maxPayloadLength,
		blockRewards,
		exceptions,
		normalizedBlock,
		lastBlock,
	});
	if (!verified) {
		throw errors;
	}
	if (typeof broadcast === 'function') {
		broadcast(normalizedBlock);
	}
	await blocksVerify.checkExists(storage, normalizedBlock);
	await blocksVerify.validateBlockSlot(delegatesModule, normalizedBlock);
	await blocksVerify.checkTransactions(
		storage,
		slots,
		normalizedBlock,
		exceptions
	);
	await blocksChain.applyBlock(
		storage,
		roundsModule,
		slots,
		normalizedBlock,
		exceptions,
		true
	);
	return normalizedBlock;
};

/**
 * Apply block without saving the block
 *
 * @returns {Block} applied block
 */
const applyBlock = async ({
	block,
	lastBlock,
	storage,
	exceptions,
	slots,
	delegatesModule,
	roundsModule,
	maxTransactionsPerBlock,
	maxPayloadLength,
	blockRewards,
}) => {
	const enhancedBlock = blocksUtils.addBlockProperties(block);
	const normalizedBlock = blocksLogic.objectNormalize(
		enhancedBlock,
		exceptions
	);
	const { verified, errors } = blocksVerify.verifyBlock({
		slots,
		delegatesModule,
		maxTransactionsPerBlock,
		maxPayloadLength,
		blockRewards,
		exceptions,
		normalizedBlock,
		lastBlock,
	});
	if (!verified) {
		throw errors;
	}
	await blocksVerify.validateBlockSlot(delegatesModule, normalizedBlock);
	await blocksVerify.checkTransactions(
		storage,
		slots,
		normalizedBlock,
		exceptions
	);
	await blocksChain.applyBlock(
		storage,
		roundsModule,
		slots,
		normalizedBlock,
		exceptions,
		false
	);
	return normalizedBlock;
};

/**
 * Apply and save block
 *
 * @param {number} blocksAmount - Amount of blocks
 * @param {number} fromHeight - Height to start at
 * @returns {Block} applied block
 */
const generateBlock = async ({
	keypair,
	timestamp,
	transactions,
	lastBlock,
	storage,
	exceptions,
	slots,
	maxPayloadLength,
	blockRewards,
}) => {
	const context = {
		blockTimestamp: timestamp,
		blockHeight: lastBlock.height + 1,
		blockVersion: blockVersion.currentBlockVersion,
	};

	const allowedTransactionsIds = transactionsModule
		.checkAllowedTransactions(context)(transactions)
		.transactionsResponses.filter(
			transactionResponse => transactionResponse.status === TransactionStatus.OK
		)
		.map(transactionReponse => transactionReponse.id);

	const allowedTransactions = transactions.filter(transaction =>
		allowedTransactionsIds.includes(transaction.id)
	);
	const {
		transactionsResponses: responses,
	} = await transactionsModule.verifyTransactions(storage, slots, exceptions)(
		allowedTransactions
	);
	const readyTransactions = transactions.filter(transaction =>
		responses
			.filter(response => response.status === TransactionStatus.OK)
			.map(response => response.id)
			.includes(transaction.id)
	);
	return blocksLogic.create({
		blockRewards,
		previousBlock: lastBlock,
		transactions: readyTransactions,
		maxPayloadLength,
		keypair,
		timestamp,
	});
};

/**
 * Apply block without saving block
 *
 * @param {number} blocksAmount - Amount of blocks
 * @param {number} fromHeight - Height to start at
 * @returns {Block} applied block
 */
const reload = async ({
	targetHeight,
	isCleaning,
	onProgress,
	storage,
	loadPerIteration,
	genesisBlock,
	slots,
	roundsModule,
	exceptions,
	delegatesModule,
	maxTransactionsPerBlock,
	maxPayloadLength,
	blockRewards,
}) => {
	await storage.entities.Account.resetMemTables();
	await rebuild({
		currentHeight: 0,
		targetHeight,
		isCleaning,
		onProgress,
		storage,
		loadPerIteration,
		genesisBlock,
		slots,
		roundsModule,
		exceptions,
		delegatesModule,
		maxTransactionsPerBlock,
		maxPayloadLength,
		blockRewards,
	});
};

// loadBlockOffset until, count < offset, offset += limit
// targetHeight until, count < offset, offset += limit

/**
 * Rebuild accounts
 *
 * @param {number} blocksAmount - Amount of blocks
 * @param {number} fromHeight - Height to start at
 * @returns {Block} applied block
 */
const rebuild = async ({
	currentHeight,
	targetHeight,
	isCleaning,
	onProgress,
	storage,
	loadPerIteration,
	genesisBlock,
	slots,
	roundsModule,
	exceptions,
	delegatesModule,
	maxTransactionsPerBlock,
	maxPayloadLength,
	blockRewards,
}) => {
	const limit = loadPerIteration || 1000;
	const blocks = await blocksUtils.loadBlockBlocksWithOffset(
		storage,
		limit,
		currentHeight
	);
	let lastBlock;
	// eslint-disable-next-line no-restricted-syntax
	for (const block of blocks) {
		if (isCleaning()) {
			return;
		}
		if (block.id === genesisBlock.block.id) {
			// eslint-disable-next-line no-await-in-loop
			lastBlock = await blocksChain.applyGenesisBlock(
				storage,
				slots,
				roundsModule,
				block,
				exceptions
			);
			onProgress(lastBlock);
			// eslint-disable-next-line no-continue
			continue;
		}
		// eslint-disable-next-line no-await-in-loop
		lastBlock = await applyBlock({
			block,
			lastBlock,
			slots,
			roundsModule,
			exceptions,
			delegatesModule,
			maxTransactionsPerBlock,
			maxPayloadLength,
			blockRewards,
		});
		onProgress(lastBlock);
	}
	const nextHeight = currentHeight + limit;
	if (currentHeight <= targetHeight) {
		await rebuild({
			currentHeight: nextHeight,
			targetHeight,
			isCleaning,
			onProgress,
			storage,
			loadPerIteration,
			genesisBlock,
			slots,
			roundsModule,
			exceptions,
			delegatesModule,
			maxTransactionsPerBlock,
			maxPayloadLength,
			blockRewards,
		});
	}
};

/**
 * Recover own blockchain state
 *
 * @param {number} blocksAmount - Amount of blocks
 * @param {number} fromHeight - Height to start at
 * @returns {Block} applied block
 */
const recoverInvalidOwnChain = async ({
	lastBlock,
	onDelete,
	storage,
	roundsModule,
	slots,
	transactionManager,
	genesisBlock,
	delegatesModule,
	maxTransactionsPerBlock,
	maxPayloadLength,
	blockRewards,
	exceptions,
}) => {
	const newLastBlock = await blocksChain.deleteLastBlock(
		storage,
		roundsModule,
		slots,
		lastBlock
	);
	onDelete(lastBlock, newLastBlock);
	const { verified } = blocksVerify.verifyBlock({
		slots,
		delegatesModule,
		maxTransactionsPerBlock,
		maxPayloadLength,
		blockRewards,
		exceptions,
		block: lastBlock,
		lastBlock: newLastBlock,
	});
	if (!verified) {
		await recoverInvalidOwnChain({
			lastBlock: newLastBlock,
			onDelete,
			storage,
			roundsModule,
			slots,
			transactionManager,
			genesisBlock,
			delegatesModule,
			maxTransactionsPerBlock,
			maxPayloadLength,
			blockRewards,
			exceptions,
		});
	}
};

module.exports = {
	processBlock,
	generateBlock,
	reload,
	rebuild,
	recoverInvalidOwnChain,
};
