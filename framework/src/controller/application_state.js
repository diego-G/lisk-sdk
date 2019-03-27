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
const semver = require('semver');

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
 * @requires semver
 * @param {Object} initialState - Initial state of the application
 * @param {Object} logger
 */
class ApplicationState {
	constructor(initialState, logger) {
		this.logger = logger;
		this.state = {
			os: os.platform() + os.release(),
			version: initialState.version,
			wsPort: initialState.wsPort,
			httpPort: initialState.httpPort,
			minVersion: initialState.minVersion,
			protocolVersion: initialState.protocolVersion,
			height: 1,
			nethash: initialState.nethash,
			broadhash: initialState.nethash,
			nonce: initialState.nonce,
		};
	}

	getState() {
		return this.state;
	}

	setChannel(channel) {
		this.channel = channel;
	}

	/**
	 * Checks version compatibility from input param against private values.
	 *
	 * @param {string} version
	 * @returns {boolean}
	 */
	versionCompatible(version) {
		if (!version) {
			return false;
		}
		return semver.gte(version, this.state.minVersion);
	}

	/**
	 * Checks protocol version compatibility from input param against
	 * private values.
	 *
	 * @param protocolVersion
	 * @returns {boolean}
	 */
	protocolVersionCompatible(protocolVersion) {
		if (!protocolVersion) {
			return false;
		}
		const peerHard = parseInt(protocolVersion[0]);
		const myHard = parseInt(this.state.protocolVersion[0]);
		return myHard === peerHard && peerHard >= 1;
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
			if (blocks.length <= 1) {
				this.state.broadhash = this.state.nethash;
				return true;
			}
			this.state.height = blocks[0].height;
			const seed = blocks.map(row => row.id).join('');
			const newBroadhash = crypto
				.createHash('sha256')
				.update(seed, 'utf8')
				.digest()
				.toString('hex');
			this.state.broadhash = newBroadhash;
			this.logger.debug('Application state', this.state);
			return true;
		} catch (err) {
			this.logger.error(err.stack);
			throw err;
		}
	}
}

module.exports = ApplicationState;
