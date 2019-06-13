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

const _ = require('lodash');
const jobsQueue = require('../utils/jobs_queue');

/**
 * Main Broadcaster logic.
 * Initializes variables, sets Broadcast routes and timer based on
 * broadcast interval from config file.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires lodash
 * @requires utils/jobs_queue
 * @param {Object} broadcasts
 * @param {boolean} force
 * @param {Transaction} transaction - Transaction instance
 * @param {Object} logger
 * @todo Add description for the params
 */
class Broadcaster {
	constructor(nonce, broadcasts, transactionPool, logger, channel, storage) {
		this.logger = logger;
		this.transactionPool = transactionPool;
		this.config = broadcasts;
		this.channel = channel;
		this.nonce = nonce;
		this.storage = storage;

		this.queue = [];

		// Broadcast routes
		this.routes = [
			{
				path: 'postTransactions',
				collection: 'transactions',
				object: 'transaction',
			},
			{
				path: 'postSignatures',
				collection: 'signatures',
				object: 'signature',
			},
		];

		if (this.config.active) {
			jobsQueue.register(
				'broadcasterReleaseQueue',
				async () => this.releaseQueue(),
				this.config.broadcastInterval
			);
		} else {
			this.logger.info(
				'Broadcasting data disabled by user through config.json'
			);
		}
	}

	/**
	 * broadcast to network.
	 *
	 * @param {Object} params
	 * @param {Object} options
	 * @returns {Promise}
	 * @throws {Error}
	 * @todo Add description for the params
	 */
	async broadcast(params, { api: event, data }) {
		// Broadcast using Elements P2P library via network module
		const wrappedData = {
			...data,
			nonce: this.nonce,
		};
		await this.channel.invoke('network:emit', {
			event,
			data: wrappedData,
		});
	}

	/**
	 * Adds new object {params, options} to queue array.
	 *
	 * @param {Object} params
	 * @param {Object} options
	 * @returns {Object[]} Queue private variable with new data
	 * @todo Add description for the params
	 */
	enqueue(params, options) {
		options.immediate = false;
		return this.queue.push({ params, options });
	}

	/**
	 * Counts relays and valid limit.
	 *
	 * @param {Object} object
	 * @returns {boolean} true - If broadcast relays exhausted
	 * @todo Add description for the params
	 */
	maxRelays(object) {
		if (!Number.isInteger(object.relays)) {
			object.relays = 0; // First broadcast
		}

		if (Math.abs(object.relays) >= this.config.relayLimit) {
			this.logger.debug('Broadcast relays exhausted', object);
			return true;
		}
		object.relays++; // Next broadcast
		return false;
	}

	/**
	 * Filters private queue based on broadcasts.
	 *
	 * @private
	 * @returns {Promise} null, boolean|undefined
	 * @todo Add description for the params
	 */
	async filterQueue() {
		this.logger.debug(`Broadcasts before filtering: ${this.queue.length}`);

		this.queue = await this.queue.reduce(async (prev, broadcast) => {
			const filteredBroadcast = await prev;
			if (broadcast.options.immediate) {
				return filteredBroadcast;
			}

			if (broadcast.options.data) {
				let transactionId;
				if (broadcast.options.data.transaction) {
					// Look for a transaction of a given "id" when broadcasting transactions
					transactionId = broadcast.options.data.transaction.id;
				} else if (broadcast.options.data.signature) {
					// Look for a corresponding "transactionId" of a given signature when broadcasting signatures
					transactionId = broadcast.options.data.signature.transactionId;
				}
				if (!transactionId) {
					return filteredBroadcast;
				}
				// Broadcast if transaction is in transaction pool
				if (this.transactionPool.transactionInPool(transactionId)) {
					filteredBroadcast.push(broadcast);
					return filteredBroadcast;
				}
				// Don't broadcast if transaction is already confirmed
				try {
					const isPersisted = await this.storage.entities.Transaction.isPersisted(
						{
							id: transactionId,
						}
					);
					if (!isPersisted) {
						filteredBroadcast.push(broadcast);
					}
					return filteredBroadcast;
				} catch (err) {
					return filteredBroadcast;
				}
			}

			filteredBroadcast.push(broadcast);

			return filteredBroadcast;
		}, []);

		this.logger.debug(`Broadcasts after filtering: ${this.queue.length}`);

		return null;
	}

	/**
	 * Groups broadcasts by api.
	 *
	 * @private
	 * @param {Object} broadcasts
	 * @returns {Object[]} Squashed routes
	 * @todo Add description for the params
	 */
	squashQueue(broadcasts) {
		const grouped = _.groupBy(broadcasts, broadcast => broadcast.options.api);
		const squashed = [];

		this.routes.forEach(route => {
			if (Array.isArray(grouped[route.path])) {
				const data = {};

				data[route.collection] = grouped[route.path]
					.map(broadcast => broadcast.options.data[route.object])
					.filter(Boolean);

				squashed.push({
					options: { api: route.path, data },
					immediate: false,
				});
			}
		});

		return squashed;
	}

	/**
	 * Releases enqueued broadcasts:
	 * - filterQueue
	 * - squashQueue
	 * - broadcast
	 *
	 * @private
	 * @returns {Promise}
	 * @throws {Error}
	 * @todo Add description for the params
	 */
	// eslint-disable-next-line class-methods-use-this
	async releaseQueue() {
		this.logger.trace('Releasing enqueued broadcasts');

		if (!this.queue.length) {
			this.logger.trace('Queue empty');
			return null;
		}
		try {
			await this.filterQueue();
			const broadcasts = this.queue.splice(0, this.broadcasts.releaseLimit);
			const squashedBroadcasts = this.squashQueue(broadcasts);

			await Promise.all(
				squashedBroadcasts.map(({ params, options }) =>
					this.broadcast(params, options)
				)
			);

			return this.logger.info(
				`Broadcasts released: ${squashedBroadcasts.length}`
			);
		} catch (err) {
			this.logger.error('Failed to release broadcast queue', err);
			throw err;
		}
	}
}

module.exports = Broadcaster;
