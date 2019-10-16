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

const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const transactionsModule = require('../transactions');

const TRANSACTION_TYPES_VOTE = 3;

const saveBlockBatch = async (storage, parsedBlock, saveBlockBatchTx) => {
	const promises = [
		storage.entities.Block.create(parsedBlock, {}, saveBlockBatchTx),
	];

	if (parsedBlock.transactions.length) {
		promises.push(
			storage.entities.Transaction.create(
				parsedBlock.transactions,
				{},
				saveBlockBatchTx,
			),
		);
	}

	return saveBlockBatchTx.batch(promises);
};

/**
 * Save block with transactions to database.
 *
 * @param {Object} block - Full normalized block
 * @param {function} cb - Callback function
 * @returns {Function|afterSave} cb - If SQL transaction was OK - returns safterSave execution, if not returns callback function from params (through setImmediate)
 * @returns {string} cb.err - Error if occurred
 */
const saveBlock = async (storage, block, tx) => {
	if (!tx) {
		throw new Error('Block should only be saved in a database tx');
	}
	// If there is already a running transaction use it
	return saveBlockBatch(storage, block, tx);
};

/**
 * Deletes last block.
 *
 * @param  {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.obj - New last block
 */
const deleteLastBlock = async (storage, lastBlock, tx) => {
	if (lastBlock.height === 1) {
		throw new Error('Cannot delete genesis block');
	}
	const [storageBlock] = await storage.entities.Block.get(
		{ id: lastBlock.previousBlock },
		{ extended: true },
		tx,
	);

	if (!storageBlock) {
		throw new Error('PreviousBlock is null');
	}

	await storage.entities.Block.delete({ id: lastBlock.id }, {}, tx);
	return storageBlock;
};

/**
 * Deletes all blocks with height >= supplied block ID.
 *
 * @param storage - Storage module dependency
 * @param {number} blockId - ID of block to begin with
 */
const deleteFromBlockId = async (storage, blockId) => {
	const block = await storage.entities.Block.getOne({
		id: blockId,
	});
	return storage.entities.Block.delete({
		height_gt: block.height,
	});
};

/**
 * Applies transactions to the confirmed state.
 *
 * @private
 * @param {Object} block - Block object
 * @param {Object} transactions - Transaction object
 * @param {Object} sender - Sender account
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 */
const applyGenesisBlockTransactions = async (
	storage,
	slots,
	transactions,
	tx,
) => {
	const { stateStore } = await transactionsModule.applyGenesisTransactions(
		storage,
	)(transactions, tx);
	await stateStore.account.finalize();
};

/**
 * Calls applyConfirmed from transactions module for each transaction in block
 *
 * @private
 * @param {Object} block - Block object
 * @param {function} tx - Database transaction
 * @returns {Promise<reject|resolve>}
 */
const applyConfirmedStep = async (storage, slots, block, exceptions, tx) => {
	if (block.transactions.length <= 0) {
		return;
	}
	const nonInertTransactions = block.transactions.filter(
		transaction =>
			!transactionsModule.checkIfTransactionIsInert(transaction, exceptions),
	);

	const {
		stateStore,
		transactionsResponses,
	} = await transactionsModule.applyTransactions(storage, exceptions)(
		nonInertTransactions,
		tx,
	);

	const unappliableTransactionsResponse = transactionsResponses.filter(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK,
	);

	if (unappliableTransactionsResponse.length > 0) {
		throw unappliableTransactionsResponse[0].errors;
	}

	await stateStore.account.finalize();
};

/**
 * Apply genesis block's transactions to blockchain.
 *
 * @param {Object} block - Full normalized genesis block
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 */
const applyConfirmedGenesisStep = async (
	storage,
	slots,
	block,
	exceptions,
	tx,
) => {
	const sortedTransactionInstances = block.transactions.sort(a => {
		if (a.type === TRANSACTION_TYPES_VOTE) {
			return 1;
		}
		return 0;
	});

	await applyGenesisBlockTransactions(
		storage,
		slots,
		sortedTransactionInstances,
		tx,
	);
	return block;
};

/**
 * Reverts confirmed transactions due to block deletion
 * @param {Object} block - secondLastBlock
 * @param {Object} tx - database transaction
 */
const undoConfirmedStep = async (storage, slots, block, exceptions, tx) => {
	if (block.transactions.length === 0) {
		return;
	}

	const nonInertTransactions = block.transactions.filter(
		transaction =>
			!exceptions.inertTransactions ||
			!exceptions.inertTransactions.includes(transaction.id),
	);

	const {
		stateStore,
		transactionsResponses,
	} = await transactionsModule.undoTransactions(storage, exceptions)(
		nonInertTransactions,
		tx,
	);

	const unappliedTransactionResponse = transactionsResponses.find(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK,
	);

	if (unappliedTransactionResponse) {
		throw unappliedTransactionResponse.errors;
	}

	await stateStore.account.finalize();
};

module.exports = {
	saveBlock,
	saveBlockBatch,
	deleteLastBlock,
	deleteFromBlockId,
	applyConfirmedStep,
	applyConfirmedGenesisStep,
	undoConfirmedStep,
};
