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

const verifyBlockNotExists = async (storage, block) => {
	const isPersisted = await storage.entities.Block.isPersisted({
		id: block.id,
	});
	if (isPersisted) {
		throw new Error(`Block ${block.id} already exists`);
	}
};

class BlocksVerify {
	constructor({ storage, exceptions, slots, roundsModule, genesisBlock }) {
		this.storage = storage;
		this.roundsModule = roundsModule;
		this.dposModule = dposModule;
		this.slots = slots;
		this.exceptions = exceptions;
		this.genesisBlock = genesisBlock;
	}

	async checkExists(block) {
		const isPersisted = await this.storage.entities.Block.isPersisted({
			id: block.id,
		});
		if (isPersisted) {
			throw new Error(`Block ${block.id} already exists`);
		}
		if (!block.transactions.length) {
			return;
		}
		const persistedTransactions = await this.storage.entities.Transaction.get({
			id_in: block.transactions.map(transaction => transaction.id),
		});

		if (persistedTransactions.length > 0) {
			throw new Error(
				`Transaction is already confirmed: ${persistedTransactions[0].id}`,
			);
		}
	}

	async verifyBlockSlot(block) {
		// Check if block was generated by the right active delagate. Otherwise, fork 3
		// DATABASE: Read only to mem_accounts to extract active delegate list
		try {
			await this.dposModule.verifyBlockForger(block);
		} catch (error) {
			this.roundsModule.fork(block, 3);
			throw error;
		}
	}

	async checkTransactions(block) {
		const { version, height, timestamp, transactions } = block;
		if (transactions.length === 0) {
			return;
		}
		const context = {
			blockVersion: version,
			blockHeight: height,
			blockTimestamp: timestamp,
		};

		const nonInertTransactions = transactions.filter(
			transaction =>
				!transactionsModule.checkIfTransactionIsInert(
					transaction,
					this.exceptions,
				),
		);

		const nonAllowedTxResponses = transactionsModule
			.checkAllowedTransactions(context)(nonInertTransactions)
			.transactionsResponses.find(
				transactionResponse =>
					transactionResponse.status !== TransactionStatus.OK,
			);

		if (nonAllowedTxResponses) {
			throw nonAllowedTxResponses.errors;
		}

		const {
			transactionsResponses,
		} = await transactionsModule.verifyTransactions(
			this.storage,
			this.slots,
			this.exceptions,
		)(nonInertTransactions);

		const unverifiableTransactionsResponse = transactionsResponses.filter(
			transactionResponse =>
				transactionResponse.status !== TransactionStatus.OK,
		);

		if (unverifiableTransactionsResponse.length > 0) {
			throw unverifiableTransactionsResponse[0].errors;
		}
	}

	matchGenesisBlock(block) {
		return (
			block.id === this.genesisBlock.id &&
			block.payloadHash.toString('hex') === this.genesisBlock.payloadHash &&
			block.blockSignature.toString('hex') === this.genesisBlock.blockSignature
		);
	}

	// TODO: remove
	async reloadRequired(blocksCount, memRounds) {
		const round = this.slots.calcRound(blocksCount);
		const unapplied = memRounds.filter(row => row.round !== round);
		if (unapplied.length > 0) {
			throw new Error('Detected unapplied rounds in mem_round');
		}
		const accounts = await this.storage.entities.Account.get(
			{ isDelegate: true },
			{ limit: null },
		);
		const delegatesPublicKeys = accounts.map(account => account.publicKey);
		if (delegatesPublicKeys.length === 0) {
			throw new Error('No delegates found');
		}
	}
}

module.exports = {
	BlocksVerify,
	verifyBlockNotExists,
};
