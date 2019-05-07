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

const { config } = require('./defaults');
const Network = require('./network');
const BaseModule = require('../base_module');

/* eslint-disable class-methods-use-this */

/**
 * Network module specification
 *
 * @namespace Framework.Modules
 * @type {module.NetworkModule}
 */
module.exports = class NetworkModule extends BaseModule {
	static get alias() {
		return 'network';
	}

	static get info() {
		return {
			author: 'LiskHQ',
			version: '0.1.0',
			name: 'lisk-framework-network',
		};
	}

	static get defaults() {
		return config;
	}

	get events() {
		return ['bootstrap', 'subscribe'];
	}

	get actions() {
		return {
			invokePublic: async action => this.network.actions.invokePublic(action),
			publish: action => this.network.actions.publish(action),
			getNetworkStatus: () => this.network.actions.getNetworkStatus(),
			getPeers: action => this.network.actions.getPeers(action),
			getPeersCountByFilter: action =>
				this.network.actions.getPeersCountByFilter(action),
		};
	}

	async load(channel) {
		this.network = new Network(this.options);
		await this.network.bootstrap(channel);
		channel.publish('network:bootstrap');
	}

	async unload() {
		return this.network.cleanup(0);
	}
};
