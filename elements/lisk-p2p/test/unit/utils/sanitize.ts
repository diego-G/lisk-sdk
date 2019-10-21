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
import { expect } from 'chai';
import {
	sanitizeIncomingPeerInfo,
	sanitizeOutgoingPeerInfo,
	sanitizeNodeInfoToLegacyFormat,
} from '../../../src/utils';
import { initPeerInfoList } from 'utils/peers';
import { P2PNodeInfo } from '../../../src/p2p_types';

describe('utils/sanitize', () => {
	describe('#sanitizeIncomingPeerInfo', () => {
		it('should return the peerInfo with ip and convert it to ipAddress', async () => {
			const samplePeers = initPeerInfoList();
			const { ipAddress, wsPort, sharedState } = samplePeers[0];
			const protocolPeerInfo = {
				ip: ipAddress,
				ipAddress,
				wsPort,
				...sharedState,
			};

			expect(sanitizeIncomingPeerInfo(protocolPeerInfo)).eql(samplePeers[0]);
		});
	});

	describe('#sanitizeOutgoingPeerInfo', () => {
		it('should return the peerInfo with ip and convert it to ipAddress', async () => {
			const samplePeers = initPeerInfoList();
			const { ipAddress, wsPort, sharedState } = samplePeers[0];
			const protocolPeerInfo = {
				ip: ipAddress,
				ipAddress,
				wsPort,
				...sharedState,
			};

			expect(sanitizeOutgoingPeerInfo(samplePeers[0])).eql(protocolPeerInfo);
		});
	});

	describe('#sanitizePeerLists', () => {
		it('should return an object with several peer lists');
	});

	describe('#sanitizeNodeInfoToLegacyFormat', () => {
		describe('when node info has nonce and httpPort', () => {
			const nodeInfo = {
				os: 'os',
				version: '1.2.0',
				protocolVersion: '1.2',
				nethash: 'nethash',
				wsPort: 6001,
				height: 100,
				nonce: 'myNonce',
				httpPort: 8888,
			} as P2PNodeInfo;

			it('should return object containing nonce property as a non-empty string', async () => {
				expect(sanitizeNodeInfoToLegacyFormat(nodeInfo))
					.to.haveOwnProperty('nonce')
					.to.eql(nodeInfo.nonce as string);
			});

			it('should return object containing httpPort property as a number', async () => {
				expect(sanitizeNodeInfoToLegacyFormat(nodeInfo))
					.to.haveOwnProperty('nonce')
					.to.eql(nodeInfo.nonce as string);
			});
		});

		describe('when node info has neither nonce, nor httpPort', () => {
			const nodeInfo = {
				os: 'os',
				version: '1.2.0',
				protocolVersion: '1.2',
				nethash: 'nethash',
				wsPort: 6001,
				height: 100,
			} as P2PNodeInfo;

			it('should return object containing nonce property as an empty string', async () => {
				expect(sanitizeNodeInfoToLegacyFormat(nodeInfo)).to.haveOwnProperty(
					'nonce',
				).to.be.empty;
			});

			it('should return object containing httpPort property with zero value', async () => {
				expect(sanitizeNodeInfoToLegacyFormat(nodeInfo))
					.to.haveOwnProperty('httpPort')
					.to.be.equal(0);
			});
		});
	});
});
