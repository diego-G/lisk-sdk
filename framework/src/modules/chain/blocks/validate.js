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

const BigNum = require('@liskhq/bignum');
const { hash, verifyData } = require('@liskhq/lisk-cryptography');

/**
 Validate block signature.
 *
 * @private
 * @func validateSignature
 * @param {Object} block - Target block
 * @param {Buffer} blockBytes - bytes of block
 */
const validateSignature = (block, blockBytes) => {
	const signatureLength = 64;
	const dataWithoutSignature = blockBytes.slice(
		0,
		blockBytes.length - signatureLength,
	);
	const hashedBlock = hash(dataWithoutSignature);

	const verified = verifyData(
		hashedBlock,
		block.blockSignature,
		block.generatorPublicKey,
	);

	if (!verified) {
		throw new Error('Invalid block signature');
	}
};

/**
 * Validate previous block.
 *
 * @func validatePreviousBlock
 * @param {Object} block - Target block
 * @param {Object} result - Verification results
 */
const validatePreviousBlock = block => {
	if (!block.previousBlock && block.height !== 1) {
		throw new Error('Invalid previous block');
	}
};

/**
 * Validate block reward.
 *
 * @func validateReward
 * @param {Object} block - Target block
 * @param {Object} blockReward - block reward functions
 * @param {Object} exceptions
 */
const validateReward = (block, blockReward, exceptions) => {
	const expectedReward = blockReward.calculateReward(block.height);
	if (
		block.height !== 1 &&
		!expectedReward.equals(block.reward) &&
		(!exceptions.blockRewards || !exceptions.blockRewards.includes(block.id))
	) {
		throw new Error(
			`Invalid block reward: ${block.reward} expected: ${expectedReward}`,
		);
	}
};

/**
 Validate block payload (transactions).
 *
 * @func validatePayload
 * @param {Object} block - Target block
 */
const validatePayload = (block, maxTransactionsPerBlock, maxPayloadLength) => {
	if (block.payloadLength > maxPayloadLength) {
		throw new Error('Payload length is too long');
	}

	if (block.transactions.length !== block.numberOfTransactions) {
		throw new Error(
			'Included transactions do not match block transactions count',
		);
	}

	if (block.transactions.length > maxTransactionsPerBlock) {
		throw new Error('Number of transactions exceeds maximum per block');
	}

	let totalAmount = new BigNum(0);
	let totalFee = new BigNum(0);
	const transactionsBytesArray = [];
	const appliedTransactions = {};

	block.transactions.forEach(transaction => {
		const transactionBytes = transaction.getBytes();

		if (appliedTransactions[transaction.id]) {
			throw new Error(`Encountered duplicate transaction: ${transaction.id}`);
		}

		appliedTransactions[transaction.id] = transaction;
		if (transactionBytes) {
			transactionsBytesArray.push(transactionBytes);
		}
		totalAmount = totalAmount.plus(transaction.amount);
		totalFee = totalFee.plus(transaction.fee);
	});

	const transactionsBuffer = Buffer.concat(transactionsBytesArray);
	const payloadHash = hash(transactionsBuffer).toString('hex');

	if (payloadHash !== block.payloadHash) {
		throw new Error('Invalid payload hash');
	}

	if (!totalAmount.equals(block.totalAmount)) {
		throw new Error('Invalid total amount');
	}

	if (!totalFee.equals(block.totalFee)) {
		throw new Error('Invalid total fee');
	}
};

/**
 * Validate block slot according to timestamp.
 *
 * @private
 * @func validateBlockSlot
 * @param {Object} block - Target block
 * @param {Object} lastBlock - Last block
 */
// TODO: Move to DPOS validation
const validateBlockSlot = (block, lastBlock, slots) => {
	const blockSlotNumber = slots.getSlotNumber(block.timestamp);
	const lastBlockSlotNumber = slots.getSlotNumber(lastBlock.timestamp);

	if (
		blockSlotNumber > slots.getSlotNumber() ||
		blockSlotNumber <= lastBlockSlotNumber
	) {
		throw new Error('Invalid block timestamp');
	}
};

/**
 * Verify block slot window according to application time.
 *
 * @private
 * @func validateBlockSlotWindow
 * @param {Object} block - Target block
 * @param {Object} slots - slots module
 * @param {Object} blockSlotWindow - expected block slot window
 */
const validateBlockSlotWindow = (block, slots, blockSlotWindow) => {
	const currentApplicationSlot = slots.getSlotNumber();
	const blockSlot = slots.getSlotNumber(block.timestamp);

	// Reject block if it's slot is older than BLOCK_SLOT_WINDOW
	if (currentApplicationSlot - blockSlot > blockSlotWindow) {
		throw new Error('Block slot is too old');
	}

	// Reject block if it's slot is in the future
	if (currentApplicationSlot < blockSlot) {
		throw new Error('Block slot is in the future');
	}
};

module.exports = {
	validateSignature,
	validatePreviousBlock,
	validateReward,
	validatePayload,
	validateBlockSlot,
	validateBlockSlotWindow,
};
