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

const { BaseSynchronizer } = require('./base_synchronizer');
const { addBlockProperties } = require('../blocks');
const {
	clearBlocksTempTable,
	restoreBlocks,
	deleteBlocksAfterHeight,
} = require('./utils');
const {
	ApplyPenaltyAndAbortError,
	ApplyPenaltyAndRestartError,
	AbortError,
	RestartError,
} = require('./errors');

class FastChainSwitchingMechanism extends BaseSynchronizer {
	constructor({
		storage,
		logger,
		channel,
		slots,
		blocks,
		bft,
		processor,
		dpos,
		activeDelegates,
	}) {
		super(storage, logger, channel);
		this.slots = slots;
		this.dpos = dpos;
		this.blocks = blocks;
		this.bft = bft;
		this.processor = processor;
		this.constants = {
			activeDelegates,
		};
		this.active = false;
	}

	// eslint-disable-next-line class-methods-use-this,no-empty-function
	async run(receivedBlock, peerId) {
		this.active = true;

		try {
			const highestCommonBlock = await this._requestLastCommonBlock(peerId);
			const blocks = await this._queryBlocks(
				receivedBlock,
				highestCommonBlock,
				peerId,
			);
			await this._validateBlocks(blocks, peerId);
			await this._switchChain(highestCommonBlock, blocks);
		} catch (err) {
			if (err instanceof ApplyPenaltyAndRestartError) {
				return this.applyPenaltyAndRestartSync(
					err.peerId,
					receivedBlock,
					err.reason,
				);
			}

			if (err instanceof ApplyPenaltyAndAbortError) {
				this.logger.info(
					{ err, peerId, reason: err.reason },
					'Applying penalty to peer and aborting synchronization mechanism',
				);
				return this.channel.invoke('network:applyPenalty', {
					peerId,
					penalty: 100,
				});
			}

			if (err instanceof RestartError) {
				this.logger.info(
					{ err, reason: err.reason },
					`Restarting synchronization mechanism with reason: ${err.reason}`,
				);
				return this.channel.publish('chain:processor:sync', {
					block: receivedBlock,
				});
			}

			if (err instanceof AbortError) {
				return this.logger.info(
					{ err, reason: err.reason },
					`Aborting synchronization mechanism with reason: ${err.reason}`,
				);
			}

			throw err;
		} finally {
			this.active = false;
		}

		return true;
	}

	/**
	 * Check if this sync mechanism is valid for the received block
	 *
	 * @param {Object} receivedBlock - The blocked received from the network
	 * @return {Promise.<Boolean|undefined>} - If the mechanism applied to received block
	 * @throws {Error} - In case want to abort the sync pipeline
	 */
	async isValidFor(receivedBlock) {
		const { lastBlock } = this.blocks;

		// 3. Step: Check whether B justifies fast chain switching mechanism
		const twoRounds = this.constants.activeDelegates * 2;
		if (Math.abs(receivedBlock.height - lastBlock.height) > twoRounds) {
			return false;
		}

		const blockRound = this.slots.calcRound(receivedBlock.height);
		const delegateList = await this.dpos.getForgerPublicKeysForRound(
			blockRound,
		);

		return delegateList.includes(receivedBlock.generatorPublicKey);
	}

	/**
	 * Queries the blocks from the selected peer.
	 * @param {Object} receivedBlock
	 * @param {Object} highestCommonBlock
	 * @param {string} peerId
	 * @return {Promise<Array<Object>>}
	 * @throws {ApplyPenaltyAndRestartError} - In case peer didn't return highest common block or its height is lower than the finalized height
	 * @throws {AbortError} - If the height difference between both chains is higher than ACTIVE_DELEGATES * 2
	 * @private
	 */
	async _queryBlocks(receivedBlock, highestCommonBlock, peerId) {
		if (
			!highestCommonBlock ||
			highestCommonBlock.height < this.bft.finalizedHeight
		) {
			throw new ApplyPenaltyAndRestartError(
				peerId,
				"Peer didn't return a common block or its height is lower than the finalized height of the chain",
			);
		}

		if (
			this.blocks.lastBlock.height - highestCommonBlock.height >
				this.constants.activeDelegates * 2 ||
			receivedBlock.height - highestCommonBlock.height >
				this.constants.activeDelegates * 2
		) {
			throw new AbortError(
				`Height difference between both chains is higher than ${this.constants
					.activeDelegates * 2}`,
			);
		}

		const blocks = await this.requestBlocksWithinIDs(
			peerId,
			highestCommonBlock.id,
			receivedBlock.id,
		);

		if (!blocks || !blocks.length) {
			throw new ApplyPenaltyAndRestartError(
				peerId,
				`Peer didn't return any requested block within IDs ${
					highestCommonBlock.id
				} and ${receivedBlock.id}`,
			);
		}

		return blocks;
	}

	/**
	 * Validates a set of blocks
	 * @param {Array<Object>} blocks - The array of blocks to validate
	 * @param {string} peerId
	 * @return {Promise<void>}
	 * @throws {ApplyPenaltyAndAbortError} - In case any of the blocks fails to validate
	 * @private
	 */
	async _validateBlocks(blocks, peerId) {
		try {
			for (const block of blocks) {
				addBlockProperties(block);
				await this.processor.validateDetached(block);
			}
		} catch (err) {
			throw new ApplyPenaltyAndAbortError(peerId, 'Block validation failed');
		}
	}

	/**
	 * Switches to desired chain
	 * @param {Object} highestCommonBlock
	 * @param {Array<Object>} blocksToApply
	 * @return {Promise<void>}
	 * @private
	 */
	async _switchChain(highestCommonBlock, blocksToApply) {
		await deleteBlocksAfterHeight(
			this.processor,
			this.blocks,
			highestCommonBlock.height,
			true,
		);

		try {
			for (const block of blocksToApply) {
				addBlockProperties(block);
				await this.processor.processValidated(block);
			}

			await clearBlocksTempTable(this.storage);
		} catch (err) {
			await deleteBlocksAfterHeight(
				this.processor,
				this.blocks,
				highestCommonBlock.height,
			);
			await restoreBlocks(this.blocks, this.processor);
		}
	}

	/**
	 * Computes the height values for the last two rounds
	 * @return {Array<number>}
	 * @private
	 */
	_computeLastTwoRoundsHeights() {
		return new Array(this.constants.activeDelegates * 2)
			.fill(0)
			.map((_, index) => this.blocks.lastBlock.height - index);
	}

	/**
	 * Requests the last common block in common with the targeted peer.
	 * In order to do that, sends a set of network calls which include a set of block ids
	 * corresponding to the first block of descendent consecutive rounds (starting from the last one).
	 *
	 * @param {string} peerId - The ID of the peer to target.
	 * @return {Promise<Object | undefined>}
	 * @private
	 */
	async _requestLastCommonBlock(peerId) {
		const requestLimit = 10; // Maximum number of requests to be made to the remote peer
		let numberOfRequests = 0; // Keeps track of the number of requests made to the remote peer

		const heightList = this._computeLastTwoRoundsHeights();

		while (numberOfRequests < requestLimit) {
			const blockIds = (await this.storage.entities.Block.get(
				{
					height_in: heightList,
				},
				{
					sort: 'height:asc',
				},
			)).map(block => block.id);

			// Request the highest common block with the previously computed list
			// to the given peer
			try {
				const { data } = await this.channel.invoke('network:requestFromPeer', {
					procedure: 'getHighestCommonBlock',
					peerId,
					data: {
						ids: blockIds,
					},
				});

				if (data) {
					return data;
				}
			} finally {
				numberOfRequests += 1;
			}
		}

		return undefined;
	}
}

module.exports = { FastChainSwitchingMechanism };
