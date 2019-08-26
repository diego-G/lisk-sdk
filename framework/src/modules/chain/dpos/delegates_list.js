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

const EventEmitter = require('events');
const { hash } = require('@liskhq/lisk-cryptography');
const { Slots } = require('./slots');
// Will be fired once a round is finished
const EVENT_ROUND_FINISHED = 'EVENT_ROUND_FINISHED';

const shuffleDelegateListForRound = (round, list) => {
	const seedSource = round.toString();
	const delegateList = [...list];
	let currentSeed = hash(seedSource, 'utf8');

	// eslint-disable-next-line no-plusplus
	for (let i = 0, delCount = delegateList.length; i < delCount; i++) {
		// eslint-disable-next-line no-plusplus
		for (let x = 0; x < 4 && i < delCount; i++, x++) {
			const newIndex = currentSeed[x] % delCount;
			const b = delegateList[newIndex];
			delegateList[newIndex] = delegateList[i];
			delegateList[i] = b;
		}
		currentSeed = hash(currentSeed);
	}

	return delegateList;
};

class DelegatesList extends EventEmitter {
	constructor({ storage, activeDelegates, exceptions }) {
		super();
		this.delegateListCache = {};
		this.storage = storage;
		this.activeDelegates = activeDelegates;
		this.exceptions = exceptions;
	}

	async getRoundDelegates(round) {
		const list = await this.generateActiveDelegateList(round);
		return shuffleDelegateListForRound(round, list);
	}

	async getDelegatePublicKeysSortedByVote() {
		const filters = { isDelegate: true };
		const options = {
			limit: this.activeDelegates,
			sort: ['vote:desc', 'publicKey:asc'],
		};
		const accounts = await this.storage.entities.Account.get(filters, options);
		return accounts.map(account => account.publicKey);
	}

	async generateActiveDelegateList(round) {
		if (this.delegateListCache[round]) {
			return this.delegateListCache[round];
		}

		let delegatePublicKeys = await this.storage.entities.RoundDelegates.getRoundDelegates(
			round,
		);

		if (!delegatePublicKeys.length) {
			delegatePublicKeys = await this.getDelegatePublicKeysSortedByVote();
			await this.storage.entities.RoundDelegates.create({
				round,
				delegatePublicKeys,
			});
		}

		const { ignoreDelegateListCacheForRounds = [] } = this.exceptions;

		if (!ignoreDelegateListCacheForRounds.includes(round)) {
			// If the round is not an exception, cache the round.
			this.delegateListCache[round] = delegatePublicKeys;
		}

		return delegatePublicKeys;
	}

	async deleteDelegateListUntilRound(round) {
		await this.storage.entities.RoundDelegates.delete({
			round_lt: round,
		});
	}

	/**
	 * Validates if block was forged by correct delegate
	 *
	 * @param {Object} block
	 */
	verifyBlockForger(block) {
		const currentSlot = Slots.getSlotNumber(block.timestamp);

		// get round
		const round = Slots.calcRound(block.height);

		// get delegate list for this round
		const delegateList = this.delegateListCache[round];

		// get delegate for this specific block
		const delegatePubKey = delegateList[currentSlot % this.activeDelegates];

		// check if this is correct
		if (delegatePubKey && block.generatorPublicKey === delegatePubKey) {
			return true;
		}

		throw new Error(`Failed to verify slot: ${currentSlot}`);
	}
}

module.exports = {
	DelegatesList,
	EVENT_ROUND_FINISHED,
	shuffleDelegateListForRound,
};
