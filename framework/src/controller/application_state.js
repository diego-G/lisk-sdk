/* eslint-disable class-methods-use-this */
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

const os = require('os');
const crypto = require('crypto');
const _ = require('lodash');

const __private = {
	state: new WeakMap(),
};

/**
 * Initial state of the entire application.
 * - os
 * - version
 * - wsPort
 * - httpPort
 * - minVersion
 * - protocolVersion
 * - height
 * - nethash
 * - broadhash
 * - nonce
 *
 * @class
 * @requires crypto
 * @requires os
 * @param {Object} initialState - Initial state of the application
 * @param {Object} logger
 */
class ApplicationState {
	constructor({
		initialState: {
			version,
			wsPort,
			httpPort,
			minVersion,
			protocolVersion,
			nethash,
			nonce,
		},
		logger,
	}) {
		this.logger = logger;
		__private.state.set(this, {
			os: os.platform() + os.release(),
			version,
			wsPort,
			httpPort,
			minVersion,
			protocolVersion,
			height: 1,
			nethash,
			broadhash: nethash,
			nonce,
		});
	}

	getState() {
		return _.cloneDeep(__private.state.get(this));
	}

	setChannel(channel) {
		this.channel = channel;
	}

	/**
	 * Updates broadhash and height values.
	 *
	 * @returns {Promise.<boolean, Error>}
	 */
	async update(blocks) {
		if (!blocks) {
			throw new TypeError('Argument blocks should be an array.');
		}
		try {
			const state = this.getState();
			if (blocks.length <= 1) {
				state.broadhash = state.nethash;
				__private.state.set(this, state);
				return true;
			}

			state.height = blocks[0].height;
			const seed = blocks.map(row => row.id).join('');
			const newBroadhash = crypto
				.createHash('sha256')
				.update(seed, 'utf8')
				.digest()
				.toString('hex');
			state.broadhash = newBroadhash;
			__private.state.set(this, state);
			this.logger.debug('Application state', this.getState());
			this.channel.publish('lisk:state:updated', this.getState());
			return true;
		} catch (err) {
			this.logger.error(err.stack);
			throw err;
		}
	}
}

module.exports = ApplicationState;
