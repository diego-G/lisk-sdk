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
const ForkChoiceRule = require('../blocks/fork_choice_rule');

class BlockSynchronizationMechanism {
	constructor({ channel, modules: { blocks } }) {
		this.channel = channel;
		this.active = false;
		this.modules = {
			blocks,
		};
	}

	async run() {
		this.active = true;
		const { connectedPeers: peers } = await this.channel.invoke(
			'network:getNetworkStatus'
		);
		if (!peers.length) {
			throw new Error('Connected peers list is empty');
		}
		// eslint-disable-next-line no-unused-vars
		const bestPeer = this._computeBestPeer(peers);
		// TODO: handle bestPeer and move on to step 2 defined in
		// https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#block-synchronization-mechanism
		// ...
		this.active = false;
	}

	isActive() {
		return this.active;
	}

	/**
	 * From an input list of peers, computes the best peer to continue working with
	 * according to the set of rules defined in Step 1. of Block Synchroniztion Mechanism
	 * @link https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#block-synchronization-mechanism
	 * @param peers
	 * @return {Array<Object>}
	 * @private
	 */
	_computeBestPeer(peers) {
		// Largest subset of peers with largest prevotedConfirmedUptoHeight
		const largestSubsetByPrevotedConfirmedUptoHeight = this._computeLargestSubsetMaxBy(
			peers,
			peer => peer.prevotedConfirmedUptoHeight
		);
		// Largest subset of peers with largest height
		const largestSubsetByHeight = this._computeLargestSubsetMaxBy(
			largestSubsetByPrevotedConfirmedUptoHeight,
			peer => peer.height
		);
		// Group peers by their block Id
		// Output: {{'lastBlockId':[peers], 'anotherBlockId': [peers]}
		const peersGroupedByBlockId = groupBy(
			largestSubsetByHeight,
			peer => peer.lastBlockId
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
		};

		if (
			!ForkChoiceRule.isDifferentChain(this.modules.blocks.lastBlock, peersTip)
		) {
			throw new Error('Violation of fork choice rule');
		}

		return selectedPeers[Math.floor(Math.random() * selectedPeers.length)];
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

module.exports = BlockSynchronizationMechanism;
