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

/**
 * Temporarily peers banning mechanism.
 *
 * @class
 * @memberof helpers
 * @param {Logger} logger
 * @param {Object} config - app configuration
 */
function BanManager(logger, config) {
	this.bannedPeers = {};
	this.config = config;
	this.logger = logger;
}

/**
 * Ban every peer for 2 minutes.
 * @type {number}
 */
BanManager.BAN_TIMEOUT = 2000;

/**
 * Temporarily bans a peer for 2 minutes.
 * Calls externally provided unbanPeer.
 *
 * @param {Peer} peer
 * @param {function} onBanFinished - called when temporarily ban finished.
 *
 * ToDo: Introduce well-designed and reasonable peer banning mechanism.
 *
 * For now no penalties for banning a peer multiple times are given.
 * Hardcoded ban length - 2 minutes also needs justification.
 */
BanManager.prototype.banTemporarily = function(peer, onBanFinished) {
	// Don't ban temporarily (ban forever) a peer hardcoded in config.json by a user.
	if (this.config.peers.access.blackList.includes(peer.ip)) {
		return;
	}

	const alreadyBannedPeer = this.bannedPeers[peer.ip];
	if (alreadyBannedPeer) {
		clearTimeout(alreadyBannedPeer.banTimeoutId);
	}

	this.bannedPeers[peer.ip] = {
		peer: peer,
		banTimeoutId: setTimeout(() => {
			onBanFinished(peer);
			delete this.bannedPeers[peer.ip];
		}),
	};
};

module.exports = BanManager;
