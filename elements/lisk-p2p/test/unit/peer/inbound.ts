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
import { SCServerSocket } from 'socketcluster-server';
import { InboundPeer } from '../../../src/peer';
import { P2PDiscoveredPeerInfo } from '../../../src/p2p_types';

describe('peer/inbound', () => {
	const DEFAULT_RANDOM_SECRET = 123;
	const defaultPeerInfo: P2PDiscoveredPeerInfo = {
		ipAddress: '12.12.12.12',
		wsPort: 5001,
		height: 545776,
		isDiscoveredPeer: true,
		version: '1.1.1',
		protocolVersion: '1.1',
	};

	const socket = <SCServerSocket>({
		on: sandbox.stub(),
	} as any);

	const defaultPeer = new InboundPeer(defaultPeerInfo, socket, {
		rateCalculationInterval: 1000,
		wsMaxMessageRate: 1000,
		wsMaxMessageRatePenalty: 10,
		secret: DEFAULT_RANDOM_SECRET,
		maxPeerInfoSize: 10000,
		maxPeerDiscoveryResponseLength: 1000,
	});

	describe('#constructor', () => {
		it('should be an instance of P2P blockchain', () =>
			expect(defaultPeer).and.be.instanceof(InboundPeer));

		it('should have a function named _handleInboundSocketError', () => {
			expect((defaultPeer as any)._handleInboundSocketError).to.be.a(
				'function',
			);
		});

		it('should have a function named _handleInboundSocketClose ', () => {
			expect((defaultPeer as any)._handleInboundSocketClose).to.be.a(
				'function',
			);
		});

		it('should should have a function named _sendPing', () => {
			expect((defaultPeer as any)._sendPing).to.be.a('function');
		});

		it('should get ping timeout', () => {
			expect((defaultPeer as any)._pingTimeoutId.id).to.eql(85);
		});

		it('should get socket property', () =>
			expect((defaultPeer as any)._socket).to.equal(socket));

		it('should bind handlers to inbound socket');
	});

	describe('#set socket', () => {
		it('should set socket');
	});

	describe('#disconnect', () => {
		it('should disconnect');
	});
});
