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
 *
 */
import {
	DEFAULT_RANDOM_SECRET,
	PEER_KIND_INBOUND,
	PEER_KIND_OUTBOUND,
} from '../../src/constants';
import { Peer } from '../../src/peer';
import { P2PDiscoveredPeerInfo } from '../../src/p2p_types';

export const initPeerInfoList = (): ReadonlyArray<P2PDiscoveredPeerInfo> => {
	const peerOption1: P2PDiscoveredPeerInfo = {
		ipAddress: '204.120.0.15',
		wsPort: 5001,
		height: 545776,
		isDiscoveredPeer: false,
		version: '1.1.1',
		protocolVersion: '1.1',
	};

	const peerOption2: P2PDiscoveredPeerInfo = {
		ipAddress: '204.120.0.16',
		wsPort: 5002,
		height: 545981,
		isDiscoveredPeer: false,
		version: '1.1.1',
		protocolVersion: '1.1',
	};

	const peerOption3: P2PDiscoveredPeerInfo = {
		ipAddress: '204.120.0.17',
		wsPort: 5008,
		height: 645980,
		isDiscoveredPeer: false,
		version: '1.3.1',
		protocolVersion: '1.1',
	};

	const peerOption4: P2PDiscoveredPeerInfo = {
		ipAddress: '204.120.0.18',
		wsPort: 5006,
		height: 645982,
		isDiscoveredPeer: false,
		version: '1.2.1',
		protocolVersion: '1.1',
	};

	const peerOption5: P2PDiscoveredPeerInfo = {
		ipAddress: '204.120.0.19',
		wsPort: 5001,
		height: 645980,
		isDiscoveredPeer: false,
		version: '1.1.1',
		protocolVersion: '1.1',
	};

	return [peerOption1, peerOption2, peerOption3, peerOption4, peerOption5];
};

export const initPeerInfoListWithSuffix = (
	ipSuffix: string,
	qty: number,
): ReadonlyArray<P2PDiscoveredPeerInfo> => {
	let peerInfos = [];
	for (let i = 0; i < qty; i++) {
		peerInfos.push({
			ipAddress: `${i % 255}.${ipSuffix}`,
			wsPort: 5000 + (i % 40000),
			height: 645980,
			kind: i % 4 === 0 ? PEER_KIND_OUTBOUND : PEER_KIND_INBOUND,
			isDiscoveredPeer: false,
			version: '1.1.1',
			protocolVersion: '1.1',
		});
	}
	return peerInfos;
};

export const initPeerList = (): ReadonlyArray<Peer> =>
	initPeerInfoList().map(
		(peerInfo: P2PDiscoveredPeerInfo) =>
			new Peer(peerInfo, {
				rateCalculationInterval: 1000,
				wsMaxMessageRate: 1000,
				wsMaxMessageRatePenalty: 10,
				secret: DEFAULT_RANDOM_SECRET,
				maxPeerInfoSize: 10000,
				maxPeerDiscoveryResponseLength: 1000,
			}),
	);
