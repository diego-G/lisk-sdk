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

const { maxBy, groupBy } = require('lodash');
const {
	deleteBlocksAfterHeightAndBackup,
	computeBlockHeightsList,
} = require('./utils');
const { FORK_STATUS_DIFFERENT_CHAIN } = require('../blocks');

const PEER_STATE_CONNECTED = 2;

class BlockSynchronizationMechanism {
	constructor({
		storage,
		logger,
		bft,
		slots,
		channel,
		blocks,
		activeDelegates,
		processorModule,
	}) {
		this.storage = storage;
		this.logger = logger;
		this.bft = bft;
		this.slots = slots;
		this.channel = channel;
		this.blocks = blocks;
		this.processorModule = processorModule;
		this.constants = {
			activeDelegates,
		};
		this.active = false;
	}

	async run(receivedBlock) {
		this.active = true;
		try {
			const peers = await this.channel.invoke('network:getPeers', {
				state: PEER_STATE_CONNECTED,
			});

			if (!peers.length) {
				throw new Error('Connected peers list is empty');
			}

			const bestPeer = await this._computeBestPeer(peers);
			await this._requestAndValidateLastBlock(receivedBlock, bestPeer);
			await this._revertToLastCommonBlock(receivedBlock, bestPeer);
		} finally {
			this.active = false;
		}
	}

	/**
	 * Helper function that encapsulates:
	 * 1. applying a penalty to a peer.
	 * 2. restarting sync.
	 * 3. throwing the reason.
	 * @param {object} peer - The object that contains the peer ID to target
	 * @param receivedBlock
	 * @param {Error } error - An error object containing the reason for applying
	 * a penalty and restarting sync
	 * @private
	 */
	_applyPenaltyAndRestartSync(peer, receivedBlock, error) {
		this.channel.invoke('network:applyPenalty', {
			peerId: peer.id,
			penalty: 100,
		});
		this.channel.publish('chain:processor:sync', { block: receivedBlock });
		throw error;
	}

	/**
	 * Reverts the current chain so the new tip of the chain corresponds to the
	 * last common block.
	 * @param receivedBlock
	 * @param {Object} peer - The selected peer to target.
	 * @return {Promise<void>}
	 * @private
	 */
	async _revertToLastCommonBlock(receivedBlock, peer) {
		const lastCommonBlock = await this._requestLastCommonBlock(peer);

		if (!lastCommonBlock) {
			this._applyPenaltyAndRestartSync(
				peer,
				receivedBlock,
				new Error(
					`No common block has been found between the system chain and the targeted peer ${
						peer.id
					}`,
				),
			);
		}

		if (lastCommonBlock.height < this.bft.finalizedHeight) {
			this._applyPenaltyAndRestartSync(
				peer,
				new Error(
					'The last common block height is less than the finalized height of the current chain',
				),
			);
		}

		await deleteBlocksAfterHeightAndBackup(
			this.processorModule,
			this.blocks,
			lastCommonBlock.height,
		);
	}

	/**
	 * Requests the last common block in common with the targeted peer.
	 * In order to do that, sends a set of network calls which include a set of block ids
	 * corresponding to the first block of descendent consecutive rounds (starting from the last one)
	 * @param peer - The peer to target.
	 * @return {Promise<Object | undefined>}
	 * @private
	 */
	async _requestLastCommonBlock(peer) {
		const blocksPerRequestLimit = 10; // Maximum number of block IDs to be included in a single request
		const requestLimit = 10; // Maximum number of requests to be made to the remote peer

		let numberOfRequests = 0; // Keeps track of the number of requests made to the remote peer
		let highestCommonBlock; // Holds the common block returned by the peer if found.
		let currentRound = Math.floor(
			this.blocks.lastBlock.height / this.constants.activeDelegates,
		); // Holds the current round number
		let currentHeight = currentRound * this.constants.activeDelegates;

		while (
			!highestCommonBlock &&
			numberOfRequests < requestLimit &&
			currentHeight > this.bft.finalizedHeight
		) {
			const blockIds = (await this.storage.entities.Block.get(
				{
					height_in: computeBlockHeightsList(
						blocksPerRequestLimit,
						currentRound,
					),
				},
				{
					sort: 'height:asc',
				},
			)).map(block => block.id);

			// Request the highest common block with the previously computed list
			// to the given peer
			const { data } = await this.channel.invoke('network:requestFromPeer', {
				procedure: 'getHighestCommonBlock',
				peerId: peer.id,
				data: blockIds,
			});

			highestCommonBlock = data; // If no common block, data is undefined.

			currentRound -= blocksPerRequestLimit;
			currentHeight = currentRound * this.constants.activeDelegates;
			numberOfRequests += 1;
		}

		return highestCommonBlock;
	}

	/**
	 * Requests the last full block from an specific peer and performs
	 * validations against this block after it has been received.
	 * If valid, the full block is returned.
	 * If invalid, an exception is thrown.
	 *
	 * This behavior is defined in section `2. Step: Obtain tip of chain` in LIP-0014
	 * @link https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#block-synchronization-mechanism
	 * @param {Object} receivedBlock - The block received from the network that
	 * triggered this syncing mechanism.
	 * @param {Object } peer - Peer object containing a peer id, necessary to target
	 * the peer specifically to request its last block of its chain.
	 * @return {Promise<Object>}
	 * @private
	 */
	async _requestAndValidateLastBlock(receivedBlock, peer) {
		const { data: networkLastBlock } = await this.channel.invoke(
			'network:requestFromPeer',
			{
				procedure: 'getLastBlock',
				peerId: peer.id,
			},
		);

		const { valid: validBlock, err } = await this._blockDetachedStatus(
			networkLastBlock,
		);

		const forkStatus = await this.processorModule.forkStatus(networkLastBlock);

		const inDifferentChain = forkStatus === FORK_STATUS_DIFFERENT_CHAIN;

		if (!validBlock || !inDifferentChain) {
			this._applyPenaltyAndRestartSync(peer, receivedBlock, err);
		}
	}

	// This wrappers allows us to check using an if
	// instead of forcing us to use a try/catch block
	// for branching code execution.
	// The original method works well in the context
	// of the Pipeline but not in other cases
	// that's why we wrap it here.
	async _blockDetachedStatus(networkLastBlock) {
		try {
			await this.processorModule.validateDetached(networkLastBlock);
			return { valid: true, err: null };
		} catch (err) {
			return { valid: false, err };
		}
	}

	get isActive() {
		return this.active;
	}

	/**
	 * Check if this sync mechanism is valid for the received block
	 *
	 * @param {object} receivedBlock - The blocked received from the network
	 * @return {Promise.<Boolean|undefined>} - If the mechanism applied to received block
	 * @throws {Error} - In case want to abort the sync pipeline
	 */
	// eslint-disable-next-line no-unused-vars
	async isValidFor(receivedBlock) {
		// 2. Step: Check whether current chain justifies triggering the block synchronization mechanism
		const finalizedBlock = await this.storage.entities.Block.getOne({
			height_eq: this.bft.finalizedHeight,
		});
		const finalizedBlockSlot = this.slots.getSlotNumber(
			finalizedBlock.timestamp,
		);
		const currentBlockSlot = this.slots.getSlotNumber();
		const threeRounds = this.constants.activeDelegates * 3;

		return finalizedBlockSlot < currentBlockSlot - threeRounds;
	}

	/**
	 * From an input list of peers, computes the best peer to continue working with
	 * according to the set of rules defined in Step 1. of Block Synchroniztion Mechanism
	 * @link https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#block-synchronization-mechanism
	 * @param peers
	 * @return {Array<Object>}
	 * @private
	 */
	async _computeBestPeer(peers) {
		// Largest subset of peers with largest prevotedConfirmedUptoHeight
		const largestSubsetByPrevotedConfirmedUptoHeight = this._computeLargestSubsetMaxBy(
			peers,
			peer => peer.prevotedConfirmedUptoHeight,
		);
		// Largest subset of peers with largest height
		const largestSubsetByHeight = this._computeLargestSubsetMaxBy(
			largestSubsetByPrevotedConfirmedUptoHeight,
			peer => peer.height,
		);
		// Group peers by their block Id
		// Output: {{'lastBlockId':[peers], 'anotherBlockId': [peers]}
		const peersGroupedByBlockId = groupBy(
			largestSubsetByHeight,
			peer => peer.lastBlockId,
		);

		const blockIds = Object.keys(peersGroupedByBlockId);
		let maxNumberOfPeersInSet = 0;
		let selectedPeers = [];
		let selectedBlockId = blockIds[0];
		// Find the largest subset
		// eslint-disable-next-line no-restricted-syntax
		for (const blockId of blockIds) {
			const peersByBlockId = peersGroupedByBlockId[blockId];
			const numberOfPeersInSet = peersByBlockId.length;
			if (
				numberOfPeersInSet > maxNumberOfPeersInSet ||
				(numberOfPeersInSet === maxNumberOfPeersInSet &&
					blockId < selectedBlockId)
			) {
				maxNumberOfPeersInSet = numberOfPeersInSet;
				selectedPeers = peersByBlockId;
				selectedBlockId = blockId;
			}
		}

		const peersTip = {
			prevotedConfirmedUptoHeight: peers[0].prevotedConfirmedUptoHeight,
			height: peers[0].height,
			version: peers[0].version,
		};

		const forkStatus = await this.processorModule.forkStatus(peersTip);

		const inDifferentChain = forkStatus === FORK_STATUS_DIFFERENT_CHAIN;

		if (!inDifferentChain) {
			throw new Error('Violation of fork choice rule');
		}

		const bestPeer =
			selectedPeers[Math.floor(Math.random() * selectedPeers.length)];
		bestPeer.id = `${bestPeer.ip}:${bestPeer.wsPort}`;
		return bestPeer;
	}

	/**
	 * Computes the largest subset of an array of object literals by the maximum
	 * value of the property returned in `condition` function
	 *
	 * @param {Array<Object>} arrayOfObjects
	 * @param {Function} propertySelectorFunc
	 * @return {Array<Object>}
	 * @private
	 *
	 * @example
	 *
	 * const input = [{id: 1, height: 2}, {id: 2, height: 3}, {id: 3, height: 3}]
	 * const output = _computeLargestSubsetMaxBy(input, item => item.height);
	 *
	 * `output` equals to: [{id: 2, height: 3}, {id: 3, height: 3}]
	 */
	// eslint-disable-next-line class-methods-use-this
	_computeLargestSubsetMaxBy(arrayOfObjects, propertySelectorFunc) {
		const maximumBy = maxBy(arrayOfObjects, propertySelectorFunc);
		const absoluteMax = propertySelectorFunc(maximumBy);
		const largestSubset = [];
		// eslint-disable-next-line no-restricted-syntax
		for (const item of arrayOfObjects) {
			if (propertySelectorFunc(item) === absoluteMax) {
				largestSubset.push(item);
			}
		}
		return largestSubset;
	}
}

module.exports = { BlockSynchronizationMechanism };
