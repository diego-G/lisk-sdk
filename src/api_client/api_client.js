/*
 * Copyright © 2017 Lisk Foundation
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
 *
 */
import {
	BETANET_NETHASH,
	BETANET_NODES,
	TESTNET_NETHASH,
	TESTNET_NODES,
	MAINNET_NETHASH,
	MAINNET_NODES,
} from 'lisk-constants';
import {
	AccountsResource,
	BlocksResource,
	DappsResource,
	DelegatesResource,
	NodeResource,
	PeersResource,
	SignaturesResource,
	TransactionsResource,
	VotersResource,
	VotesResource,
} from './resources';

const defaultOptions = {
	bannedNode: [],
	randomizeNode: true,
};

const commonHeaders = {
	'Content-Type': 'application/json',
};

export default class APIClient {
	constructor(nodes, providedOptions = {}) {
		this.initialize(nodes, providedOptions);

		this.accounts = new AccountsResource(this);
		this.blocks = new BlocksResource(this);
		this.dapps = new DappsResource(this);
		this.delegates = new DelegatesResource(this);
		this.node = new NodeResource(this);
		this.peers = new PeersResource(this);
		this.signatures = new SignaturesResource(this);
		this.transactions = new TransactionsResource(this);
		this.voters = new VotersResource(this);
		this.votes = new VotesResource(this);
	}

	static createMainnetAPIClient(options) {
		return new APIClient(
			MAINNET_NODES,
			Object.assign({}, options, { nethash: MAINNET_NETHASH }),
		);
	}

	static createTestnetAPIClient(options) {
		return new APIClient(
			TESTNET_NODES,
			Object.assign({}, options, { nethash: TESTNET_NETHASH }),
		);
	}

	static createBetanetAPIClient(options) {
		return new APIClient(
			BETANET_NODES,
			Object.assign({}, options, { nethash: BETANET_NETHASH }),
		);
	}

	initialize(nodes, providedOptions = {}) {
		if (!Array.isArray(nodes) || nodes.length <= 0) {
			throw new Error('APIClient requires nodes for initialization.');
		}

		const options = Object.assign({}, defaultOptions, providedOptions);

		this.headers = options.nethash
			? Object.assign({}, commonHeaders, { nethash: options.nethash })
			: commonHeaders;
		this.nodes = nodes;
		this.bannedNodes = [...(options.bannedNodes || [])];
		this.currentNode = options.node || this.getNewNode();
		this.randomizeNodes = options.randomizeNodes !== false;
	}

	getNewNode() {
		const nodes = this.nodes.filter(node => !this.isBanned(node));

		if (nodes.length === 0) {
			throw new Error('Cannot get new node: all nodes have been banned.');
		}

		const randomIndex = Math.floor(Math.random() * nodes.length);
		return nodes[randomIndex];
	}

	banNode(node) {
		if (!this.isBanned(node)) {
			this.bannedNodes.push(node);
			return true;
		}
		return false;
	}

	banActiveNode() {
		return this.banNode(this.currentNode);
	}

	banActiveNodeAndSelect() {
		const banned = this.banActiveNode();
		if (banned) {
			this.currentNode = this.getNewNode();
		}
		return banned;
	}

	hasAvailableNodes() {
		return this.nodes.some(node => !this.isBanned(node));
	}

	isBanned(node) {
		return this.bannedNodes.includes(node);
	}
}
