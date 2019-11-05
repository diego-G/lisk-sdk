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

const FORK_STATUS_IDENTICAL_BLOCK = 1;
const FORK_STATUS_VALID_BLOCK = 2;
const FORK_STATUS_DOUBLE_FORGING = 3;
const FORK_STATUS_TIE_BREAK = 4;
const FORK_STATUS_DIFFERENT_CHAIN = 5;
const FORK_STATUS_DISCARD = 6;

/**
 * Utility functions only required in this file.
 */

/**
 * Wrapper for readability. Returns the forging slot of a block
 * @param slots
 * @param block
 * @return {number}
 */
const forgingSlot = (slots, block) => slots.getSlotNumber(block.timestamp);

/**
 * Wrapper for readability. Returns whether a block was received in its designated
 * forging slot.
 * @param slots
 * @param receivedBlock
 * @return {boolean}
 */
const isBlockReceivedWithinForgingSlot = (slots, { timestamp, receivedAt }) =>
	slots.isWithinTimeslot(slots.getSlotNumber(timestamp), receivedAt);

/**
 * Returns whether the last block applied (tip of the chain) was received withing its
 * designated forging slot.
 *
 * IMPORTANT: If the last block applied on the chain was not received from the network
 * but instead it was explicitly synced or forged, the return value of this function is true
 * This is evaluated in the first line.
 * @param slots
 * @param lastAppliedBlock
 * @return {boolean}
 */
const isLastAppliedBlockReceivedWithinForgingSlot = (
	slots,
	lastAppliedBlock,
) => {
	// If the block doesn't have the property `receivedAt` it meants it was forged
	// or synced, therefore we assume it was "received in the correct slot"
	if (!lastAppliedBlock.receivedAt) {
		return true;
	}

	return isBlockReceivedWithinForgingSlot(slots, lastAppliedBlock);
};

/**
 * Fork Choice Rules
 */

/**
 * Determine if Case 2 fulfills
 * @param lastBlock
 * @param currentBlock
 * @return {boolean}
 * @private
 */
// eslint-disable-next-line class-methods-use-this
const isValidBlock = (lastBlock, currentBlock) =>
	lastBlock.height + 1 === currentBlock.height &&
	lastBlock.id === currentBlock.previousBlockId;

/**
 * Determine if Case 1 fulfills
 * @param lastBlock
 * @param currentBlock
 * @return {boolean}
 * @private
 */
// eslint-disable-next-line class-methods-use-this
const isIdenticalBlock = (lastBlock, currentBlock) =>
	lastBlock.id === currentBlock.id;

/**
 * Determine if two blocks are duplicates
 * @param lastBlock
 * @param currentBlock
 * @return {boolean}
 * @private
 */
// eslint-disable-next-line class-methods-use-this
const isDuplicateBlock = (lastBlock, currentBlock) =>
	lastBlock.height === currentBlock.height &&
	lastBlock.prevotedConfirmedUptoHeight ===
		currentBlock.prevotedConfirmedUptoHeight &&
	lastBlock.previousBlockId === currentBlock.previousBlockId;

/**
 * Determine if Case 3 fulfills
 * @param lastBlock
 * @param currentBlock
 * @return {boolean}
 * @private
 */
const isDoubleForging = (lastBlock, currentBlock) =>
	isDuplicateBlock(lastBlock, currentBlock) &&
	lastBlock.generatorPublicKey === currentBlock.generatorPublicKey;

/**
 *
 * Determine if Case 4 fulfills
 * @param slots
 * @param lastAppliedBlock
 * @param receivedBlock
 * @param receivedBlockReceiptTime
 * @param lastReceivedAndAppliedBlock
 * @return {boolean}
 */
const isTieBreak = ({ slots, lastAppliedBlock, receivedBlock }) =>
	isDuplicateBlock(lastAppliedBlock, receivedBlock) &&
	forgingSlot(slots, lastAppliedBlock) < forgingSlot(slots, receivedBlock) &&
	!isLastAppliedBlockReceivedWithinForgingSlot(slots, lastAppliedBlock) &&
	isBlockReceivedWithinForgingSlot(slots, receivedBlock);

/**
 * Determine if Case 5 fulfills
 * @param lastBlock
 * @param currentBlock
 * @return {boolean}
 */
// eslint-disable-next-line class-methods-use-this
const isDifferentChain = (lastBlock, currentBlock) => {
	const prevotedConfirmedUptoHeight =
		lastBlock.prevotedConfirmedUptoHeight || 0;

	return (
		prevotedConfirmedUptoHeight < currentBlock.prevotedConfirmedUptoHeight ||
		(lastBlock.height < currentBlock.height &&
			prevotedConfirmedUptoHeight === currentBlock.prevotedConfirmedUptoHeight)
	);
};

module.exports = {
	FORK_STATUS_IDENTICAL_BLOCK,
	FORK_STATUS_VALID_BLOCK,
	FORK_STATUS_DOUBLE_FORGING,
	FORK_STATUS_TIE_BREAK,
	FORK_STATUS_DIFFERENT_CHAIN,
	FORK_STATUS_DISCARD,
	isTieBreak,
	isDoubleForging,
	isDifferentChain,
	isIdenticalBlock,
	isValidBlock,
	isDuplicateBlock,
};
