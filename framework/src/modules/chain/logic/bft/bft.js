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

const HeadersList = require('./headers_list');
const blockHeaderSchema = require('./block_header_schema');
const { validate } = require('../../../../../src/controller/validator');

/**
 * @typedef {Object} BlockHeader
 * @property {string} blockId
 * @property {int} height
 * @property {int} maxHeightPreviouslyForged
 * @property {int} prevotedConfirmedUptoHeight
 * @property {int} activeSinceRound
 * @property {string} delegatePublicKey
 */

class BFT {
	constructor({ finalizedHeight, activeDelegates = 101 }) {
		// Set constants
		this.ACTIVE_DELEGATES = activeDelegates;

		// Threshold to consider a block prevoted
		this.PRE_VOTE_THRESHOLD = Math.ceil((this.ACTIVE_DELEGATES * 2) / 3);

		// Threshold to consider a block pre-committed (or finalized)
		this.PRE_COMMIT_THRESHOLD = Math.ceil((this.ACTIVE_DELEGATES * 2) / 3);

		// Limit to of blocks to must have to make any prevote-precommit verification on blocks (1 block less than 3 rounds)
		this.PROCESSING_THRESHOLD = this.ACTIVE_DELEGATES * 3 - 1;

		// Maximum headers to store (5 rounds)
		this.MAX_HEADERS = this.ACTIVE_DELEGATES * 5;

		this.headers = new HeadersList({ size: this.MAX_HEADERS });

		// Height up to which blocks are finalized
		this.finalizedHeight = finalizedHeight || 0;

		// Height up to which blocks have pre-voted
		this.prevotedConfirmedHeight = 0;

		this.state = {};
		this.preVotes = {};
		this.preCommits = {};
	}

	/**
	 * Add block header to BFT
	 *
	 * @param {BlockHeader} blockHeader
	 * @return {BFT}
	 */
	addBlockHeader(blockHeader) {
		// Validate the schema of the header
		BFT.validateBlockHeader(blockHeader);

		// Verify the integrity of the header with chain
		this.verifyBlockHeaders(blockHeader);

		// Add the header to the list
		this.headers.add(blockHeader);

		// Update the pre-votes and pre-commits
		this.updatePreVotesPreCommits(blockHeader);

		return this;
	}

	/**
	 * Update pre-votes and pre-commits in reference to particular block header
	 *
	 * @param {BlockHeader} lastBlockHeader
	 * @return {undefined}
	 */
	updatePreVotesPreCommits(lastBlockHeader) {
		// Update applies particularly in reference to last block header in the list
		const header = lastBlockHeader || this.headers.last;

		// If delegate forged a block with higher or same height previously
		// that means he is forging on other chain and we don't count any
		// pre-votes and pre-commits from him
		if (header.maxHeightPreviouslyForged >= header.height) {
			return;
		}

		// Get delegate public key
		const delegatePublicKey = header.delegatePublicKey;

		// Load or initialize delegate state in reference to current BFT block headers
		const delegateState = this.state[delegatePublicKey] || {
			maxPreVoteHeight: 0,
			maxPreCommitHeight: 0,
		};

		// Get first block of the round when delegate was active
		const delegateMinHeightActive =
			(header.activeSinceRound - 1) * this.ACTIVE_DELEGATES + 1;

		// If delegate is new then first block of the round will be considered
		// if it forged before then we probably have the last commit height
		// delegate can't pre-commit and block before above mentioned conditions
		const minPreCommit = Math.max(
			delegateMinHeightActive,
			delegateState.maxPreCommitHeight + 1
		);

		// Delegate can't pre-commit the blocks on tip of the chain
		const maxPreCommitHeight = header.height - 1;

		for (let j = minPreCommit; j <= maxPreCommitHeight; j++) {
			// Add pre-commit if threshold is reached
			if (this.preVotes[j] >= this.PRE_VOTE_THRESHOLD) {
				// Increase the pre-commit for particular height
				this.preCommits[j] = (this.preCommits[j] || 0) + 1;

				// Keep track of the last pre-commit point
				delegateState.maxPreCommitHeight = j;
			}
		}

		// Check between height of first block of the round when delegate was active
		// Or one step ahead where it forged the last block
		// Or one step ahead where it left the last pre-vote
		// Or maximum 3 rounds backward
		const minPreVoteHeight = Math.max(
			delegateMinHeightActive,
			header.maxHeightPreviouslyForged + 1,
			delegateState.maxPreVoteHeight + 1,
			header.height - this.PROCESSING_THRESHOLD
		);
		// Pre-vote upto current block height
		const maxPreVoteHeight = header.height;
		for (let j = minPreVoteHeight; j <= maxPreVoteHeight; j++) {
			this.preVotes[j] = (this.preVotes[j] || 0) + 1;
		}
		// Update delegate state
		delegateState.maxPreVoteHeight = maxPreVoteHeight;

		// Set the delegate state
		this.state[delegatePublicKey] = delegateState;
	}

	/**
	 * Verify if the block header is good for current chain
	 *
	 * @param {BlockHeader} blockHeader
	 */
	verifyBlockHeaders(blockHeader) {
		// We need minimum PROCESSING_THRESHOLD to decide
		// if prevotedConfirmedUptoHeight is correct
		if (
			this.headers.length >= this.PROCESSING_THRESHOLD &&
			blockHeader.prevotedConfirmedUptoHeight !== this.prevotedConfirmedHeight
		) {
			throw new Error('Wrong provtedConfirmedHeight in blockHeader.');
		}

		const delegateLastBlock = this.headers.getBlockHeaderForDelegate(
			blockHeader.delegatePublicKey,
			{ fromTop: this.PROCESSING_THRESHOLD }
		);

		if (!delegateLastBlock) {
			return true;
		}

		if (
			delegateLastBlock.maxHeightPreviouslyForged ===
				blockHeader.maxHeightPreviouslyForged &&
			delegateLastBlock.height >= blockHeader.height
		) {
			// Violation of the fork choice rule as delegate moved to different chain
			// without strictly larger maxHeightPreviouslyForged or larger height as
			// justification. This in particular happens, if a delegate is double forging.
			throw new Error(
				'Violation of fork choice rule, delegate moved to different chain'
			);
		}

		if (delegateLastBlock.height > blockHeader.maxHeightPreviouslyForged) {
			throw new Error('Violates disjointness condition');
		}

		if (
			delegateLastBlock.prevotedConfirmedUptoHeight >
			blockHeader.prevotedConfirmedUptoHeight
		) {
			throw new Error(
				'Violates that delegate chooses branch with largest prevotedConfirmedUptoHeight'
			);
		}

		return true;
	}

	/**
	 * Validate schema of block header
	 *
	 * @param {BlockHeader} blockHeader
	 * @return {boolean}
	 */
	static validateBlockHeader(blockHeader) {
		return validate(blockHeaderSchema, blockHeader);
	}

	get minHeight() {
		return this.headers.first.height;
	}

	get maxHeight() {
		return this.headers.last.height;
	}
}

module.exports = BFT;
