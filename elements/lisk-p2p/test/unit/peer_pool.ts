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
	PeerPool,
	PROTECT_BY,
	PROTECTION_CATEGORY,
	filterPeersByCategory,
} from '../../src/peer_pool';
import {
	selectPeersForConnection,
	selectPeersForRequest,
	selectPeersForSend,
} from '../../src/utils';
// For stubbing
import * as utils from '../../src/utils';
import { P2PDiscoveredPeerInfo, P2PPeerInfo } from '../../src/p2p_types';
import { Peer, ConnectionState } from '../../src/peer';
import { initializePeerList, initializePeerInfoList } from '../utils/peers';
import {
	DEFAULT_CONNECT_TIMEOUT,
	DEFAULT_ACK_TIMEOUT,
	DEFAULT_WS_MAX_PAYLOAD,
	DEFAULT_BAN_TIME,
	DEFAULT_MAX_OUTBOUND_CONNECTIONS,
	DEFAULT_MAX_INBOUND_CONNECTIONS,
	DEFAULT_OUTBOUND_SHUFFLE_INTERVAL,
	DEFAULT_PEER_PROTECTION_FOR_NETGROUP,
	DEFAULT_PEER_PROTECTION_FOR_LATENCY,
	DEFAULT_PEER_PROTECTION_FOR_USEFULNESS,
	DEFAULT_PEER_PROTECTION_FOR_LONGEVITY,
	DEFAULT_RANDOM_SECRET,
	DEFAULT_SEND_PEER_LIMIT,
} from '../../src/constants';

describe('peerPool', () => {
	const peerPoolConfig = {
		connectTimeout: DEFAULT_CONNECT_TIMEOUT,
		ackTimeout: DEFAULT_ACK_TIMEOUT,
		peerSelectionForConnection: selectPeersForConnection,
		peerSelectionForRequest: selectPeersForRequest,
		peerSelectionForSend: selectPeersForSend,
		sendPeerLimit: 24,
		wsMaxPayload: DEFAULT_WS_MAX_PAYLOAD,
		wsMaxMessageRate: 100,
		wsMaxMessageRatePenalty: 10,
		rateCalculationInterval: 1000,
		peerBanTime: DEFAULT_BAN_TIME,
		maxOutboundConnections: DEFAULT_MAX_OUTBOUND_CONNECTIONS,
		maxInboundConnections: DEFAULT_MAX_INBOUND_CONNECTIONS,
		outboundShuffleInterval: DEFAULT_OUTBOUND_SHUFFLE_INTERVAL,
		netgroupProtectionRatio: DEFAULT_PEER_PROTECTION_FOR_NETGROUP,
		latencyProtectionRatio: DEFAULT_PEER_PROTECTION_FOR_LATENCY,
		productivityProtectionRatio: DEFAULT_PEER_PROTECTION_FOR_USEFULNESS,
		longevityProtectionRatio: DEFAULT_PEER_PROTECTION_FOR_LONGEVITY,
		maxPeerInfoSize: 10000,
		maxPeerDiscoveryResponseLength: 1000,
		secret: DEFAULT_RANDOM_SECRET,
		peerLists: {
			blacklistedPeers: [],
			fixedPeers: [],
			previousPeers: [],
			seedPeers: [],
			whitelisted: [],
		},
	};
	const peerPool = new PeerPool(peerPoolConfig);

	describe('#constructor', () => {
		it('should be an object and instance of PeerPool', async () => {
			expect(peerPool)
				.to.be.an('object')
				.and.be.instanceof(PeerPool);
		});

		it('should have a _peerMap property which is a Map', async () => {
			expect(peerPool)
				.to.have.property('_peerMap')
				.which.is.instanceOf(Map);
		});

		it('should have a _peerPoolConfig property which is set to the value specified in the constructor', async () => {
			expect(peerPool)
				.to.have.property('_peerPoolConfig')
				.which.equals(peerPoolConfig);
		});

		it('should have a _peerConfig property which is set to the value specified in the constructor', async () => {
			const actualConfig = { ...(peerPool as any)._peerConfig };
			const expectedConfig = {
				connectTimeout: peerPoolConfig.connectTimeout,
				ackTimeout: peerPoolConfig.ackTimeout,
				wsMaxMessageRate: peerPoolConfig.wsMaxMessageRate,
				wsMaxMessageRatePenalty: peerPoolConfig.wsMaxMessageRatePenalty,
				maxPeerDiscoveryResponseLength:
					peerPoolConfig.maxPeerDiscoveryResponseLength,
				rateCalculationInterval: peerPoolConfig.rateCalculationInterval,
				wsMaxPayload: peerPoolConfig.wsMaxPayload,
				maxPeerInfoSize: peerPoolConfig.maxPeerInfoSize,
				secret: peerPoolConfig.secret,
			};
			expect(actualConfig.connectTimeout).to.equal(
				expectedConfig.connectTimeout,
			);
			expect(actualConfig.ackTimeout).to.equal(expectedConfig.ackTimeout);
			expect(actualConfig.wsMaxMessageRate).to.equal(
				expectedConfig.wsMaxMessageRate,
			);
			expect(actualConfig.wsMaxMessageRatePenalty).to.equal(
				expectedConfig.wsMaxMessageRatePenalty,
			);
			expect(actualConfig.maxPeerDiscoveryResponseLength).to.equal(
				expectedConfig.maxPeerDiscoveryResponseLength,
			);
			expect(actualConfig.rateCalculationInterval).to.equal(
				expectedConfig.rateCalculationInterval,
			);
			expect(actualConfig.wsMaxPayload).to.equal(expectedConfig.wsMaxPayload);
			expect(actualConfig.maxPeerInfoSize).to.equal(
				expectedConfig.maxPeerInfoSize,
			);
			expect(actualConfig.secret).to.equal(expectedConfig.secret);
		});

		it('should have a _peerLists property which is set to the value specified in the constructor', async () => {
			expect(peerPool)
				.to.have.property('_peerLists')
				.which.equals(peerPoolConfig.peerLists);
		});

		it('should have a _peerSelectForSend property which is set to the value specified in the constructor', async () => {
			expect(peerPool)
				.to.have.property('_peerSelectForSend')
				.which.equals(peerPoolConfig.peerSelectionForSend);
		});

		it('should have a _peerSelectForRequest property which is set to the value specified in the constructor', async () => {
			expect(peerPool)
				.to.have.property('_peerSelectForRequest')
				.which.equals(peerPoolConfig.peerSelectionForRequest);
		});

		it('should have a _peerSelectForConnection property which is set to the value specified in the constructor', async () => {
			expect(peerPool)
				.to.have.property('_peerSelectForConnection')
				.which.equals(peerPoolConfig.peerSelectionForConnection);
		});

		it('should have a _maxOutboundConnections property which is set to the value specified in the constructor', async () => {
			expect(peerPool)
				.to.have.property('_maxOutboundConnections')
				.which.equals(peerPoolConfig.maxOutboundConnections);
		});

		it('should have a _maxInboundConnections property which is set to the value specified in the constructor', async () => {
			expect(peerPool)
				.to.have.property('_maxInboundConnections')
				.which.equals(peerPoolConfig.maxInboundConnections);
		});

		it('should have a _sendPeerLimit property which is set to the value specified in the constructor', async () => {
			expect(peerPool)
				.to.have.property('_sendPeerLimit')
				.which.equals(peerPoolConfig.sendPeerLimit);
		});

		it('should have a _outboundShuffleIntervalId property', async () => {
			expect(peerPool).to.have.property('_outboundShuffleIntervalId');
		});
	});

	describe('#filterPeersByCategory', () => {
		const originalPeers = [...new Array(10).keys()].map(i => ({
			id: i,
			netgroup: i,
			latency: i,
			responseRate: i % 2 ? 0 : 1,
			connectTime: i,
		}));

		it('should protect peers with highest netgroup value when sorted by ascending', async () => {
			const filteredPeers = filterPeersByCategory(originalPeers as any, {
				category: PROTECTION_CATEGORY.NET_GROUP,
				percentage: 0.2,
				protectBy: PROTECT_BY.HIGHEST,
			});

			filteredPeers.forEach(peer => {
				expect(peer.netgroup).to.be.greaterThan(1);
			});
		});

		it('should protect peers with lowest latency value when sorted by descending', async () => {
			const filteredPeers = filterPeersByCategory(originalPeers as any, {
				category: PROTECTION_CATEGORY.LATENCY,
				percentage: 0.2,
				protectBy: PROTECT_BY.LOWEST,
			});

			filteredPeers.forEach(peer => {
				expect(peer.latency).to.be.lessThan(3);
			});
		});

		it('should protect 2 peers with responseRate value of 1 when sorted by ascending', async () => {
			const filteredPeers = filterPeersByCategory(originalPeers as any, {
				category: PROTECTION_CATEGORY.RESPONSE_RATE,
				percentage: 0.2,
				protectBy: PROTECT_BY.HIGHEST,
			});

			expect(filteredPeers.filter(p => p.responseRate === 1).length).to.eql(2);
		});

		it('should protect peers with lowest connectTime value when sorted by descending', async () => {
			const filteredPeers = filterPeersByCategory(originalPeers as any, {
				category: PROTECTION_CATEGORY.CONNECT_TIME,
				percentage: 0.2,
				protectBy: PROTECT_BY.LOWEST,
			});

			filteredPeers.forEach(peer => {
				expect(peer.connectTime).to.be.lessThan(2);
			});
		});
	});

	// Expected protection candidates for 100 inbound peers using default ratios:
	// netgroup: 4 peers, latency: 7 peers, usefulness: 7 peers, longevity: 41 peers
	// Rounding up for +1 difference in some expectations
	describe('#_selectPeersForEviction', () => {
		let originalPeers: Array<any> = [];

		beforeEach(async () => {
			originalPeers = [...new Array(100).keys()].map(i => ({
				id: i,
				netgroup: i,
				latency: i,
				responseRate: i % 2 ? 0 : 1,
				connectTime: i,
			}));
			(peerPool as any)._peerPoolConfig.netgroupProtectionRatio = DEFAULT_PEER_PROTECTION_FOR_NETGROUP;
			(peerPool as any)._peerPoolConfig.latencyProtectionRatio = DEFAULT_PEER_PROTECTION_FOR_LATENCY;
			(peerPool as any)._peerPoolConfig.productivityProtectionRatio = DEFAULT_PEER_PROTECTION_FOR_USEFULNESS;
			(peerPool as any)._peerPoolConfig.longevityProtectionRatio = DEFAULT_PEER_PROTECTION_FOR_LONGEVITY;
			sandbox
				.stub(utils, 'constructPeerIdFromPeerInfo')
				.returns('notAWhitelistedId');
		});

		describe('when node using default protection ratio values has 100 inbound peers', () => {
			beforeEach(() => {
				sandbox.stub(peerPool, 'getPeers').returns(originalPeers as Peer[]);
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).to.eql(42);
			});
		});

		describe('when node using default protection ratio values has 10 inbound peers', () => {
			beforeEach(() => {
				originalPeers = [...new Array(10).keys()].map(i => ({
					id: i,
					netgroup: i,
					latency: i,
					responseRate: i % 2 ? 0 : 1,
					connectTime: i,
				}));
				sandbox.stub(peerPool, 'getPeers').returns(originalPeers as Peer[]);
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).to.eql(3);
			});
		});

		describe('when node using default protection ratio values has 5 inbound peers', () => {
			beforeEach(() => {
				originalPeers = [...new Array(5).keys()].map(i => ({
					id: i,
					netgroup: i,
					latency: i,
					responseRate: i % 2 ? 0 : 1,
					connectTime: i,
				}));
				sandbox.stub(peerPool, 'getPeers').returns(originalPeers as Peer[]);
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).to.eql(1);
			});
		});

		describe('when node using default protection ratio values has 0 inbound peers', () => {
			beforeEach(() => {
				originalPeers = [];
				sandbox.stub(peerPool, 'getPeers').returns(originalPeers as Peer[]);
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).to.eql(0);
			});
		});

		describe('when node with netgroup protection disabled has 100 inbound peers', () => {
			beforeEach(() => {
				(peerPool as any)._peerPoolConfig.netgroupProtectionRatio = 0;
				sandbox.stub(peerPool, 'getPeers').returns(originalPeers as Peer[]);
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).to.eql(44);
			});
		});

		describe('when node with latency protection disabled has 100 inbound peers', () => {
			beforeEach(() => {
				(peerPool as any)._peerPoolConfig.latencyProtectionRatio = 0;
				sandbox.stub(peerPool, 'getPeers').returns(originalPeers as Peer[]);
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).to.eql(45);
			});
		});

		describe('when node with usefulness protection disabled has 100 inbound peers', () => {
			beforeEach(() => {
				(peerPool as any)._peerPoolConfig.productivityProtectionRatio = 0;
				sandbox.stub(peerPool, 'getPeers').returns(originalPeers as Peer[]);
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).to.eql(44);
			});
		});

		describe('when node with longevity protection disabled has 100 inbound peers', () => {
			beforeEach(() => {
				(peerPool as any)._peerPoolConfig.longevityProtectionRatio = 0;
				sandbox.stub(peerPool, 'getPeers').returns(originalPeers as Peer[]);
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).to.eql(84);
			});
		});

		describe('when node has all inbound protection disabled has 10 inbound peers', () => {
			beforeEach(() => {
				(peerPool as any)._peerPoolConfig.netgroupProtectionRatio = 0;
				(peerPool as any)._peerPoolConfig.latencyProtectionRatio = 0;
				(peerPool as any)._peerPoolConfig.productivityProtectionRatio = 0;
				(peerPool as any)._peerPoolConfig.longevityProtectionRatio = 0;
				originalPeers = [...new Array(10).keys()].map(i => ({
					id: i,
					netgroup: i,
					latency: i,
					responseRate: i % 2 ? 0 : 1,
					connectTime: i,
				}));
				sandbox.stub(peerPool, 'getPeers').returns(originalPeers as Peer[]);
			});

			it('should not evict any candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).to.eql(10);
			});
		});
	});

	// TODO: adjust unit tests to the new nature of peers
	describe.skip('#getConnectedPeers', () => {
		describe('when there are some active peers in inbound and outbound', () => {
			const peerList: ReadonlyArray<Peer> = initializePeerList();
			let activePeersInfoList: ReadonlyArray<P2PPeerInfo>;

			beforeEach(async () => {
				sandbox.stub(peerList[0], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[1], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[2], 'state').get(() => ConnectionState.CLOSED);

				activePeersInfoList = [peerList[0], peerList[1]].map(
					peer => peer.peerInfo,
				);
				sandbox.stub(peerPool, 'getConnectedPeers').returns(peerList);
			});

			it('should return active peers', async () => {
				expect(peerPool.getConnectedPeers().map(peer => peer.peerInfo)).eql(
					activePeersInfoList,
				);
			});
		});

		describe('when there are some active peers only in inbound', () => {
			const peerList: ReadonlyArray<Peer> = initializePeerList();
			let activePeersInfoList: ReadonlyArray<P2PPeerInfo>;

			beforeEach(async () => {
				sandbox.stub(peerList[0], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[1], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[2], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[3], 'state').get(() => ConnectionState.CLOSED);

				activePeersInfoList = [peerList[0], peerList[1], peerList[2]].map(
					peer => peer.peerInfo,
				);
				sandbox.stub(peerPool, 'getConnectedPeers').returns(peerList);
			});

			it('should return active peers having inbound connection', async () => {
				expect(peerPool.getConnectedPeers().map(peer => peer.peerInfo)).eql(
					activePeersInfoList,
				);
			});
		});

		describe('when there are some active peers only in outbound', () => {
			const peerList: ReadonlyArray<Peer> = initializePeerList();
			let activePeersInfoList: ReadonlyArray<P2PPeerInfo>;

			beforeEach(async () => {
				sandbox.stub(peerList[0], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[1], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[2], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[3], 'state').get(() => ConnectionState.CLOSED);

				activePeersInfoList = [peerList[0], peerList[1], peerList[2]].map(
					peer => peer.peerInfo,
				);
				sandbox.stub(peerPool, 'getConnectedPeers').returns(peerList);
			});

			it('should return active peers having outbound connection', async () => {
				expect(peerPool.getConnectedPeers().map(peer => peer.peerInfo)).eql(
					activePeersInfoList,
				);
			});
		});

		describe('when there are no active peers', () => {
			const peerList: ReadonlyArray<Peer> = initializePeerList();

			beforeEach(async () => {
				peerList.forEach(peer =>
					sandbox.stub(peer, 'state').get(() => ConnectionState.CLOSED),
				);

				sandbox.stub(peerPool, 'getConnectedPeers').returns(peerList);
			});

			it('should return an empty array', async () => {
				expect(peerPool.getConnectedPeers().map(peer => peer.peerInfo)).eql([]);
			});
		});
	});

	describe('#request', () => {
		describe('when no peers are found', () => {
			let caughtError: Error;
			beforeEach(async () => {
				(peerPool as any)._peerSelectForRequest = sandbox
					.stub()
					.returns([] as ReadonlyArray<P2PPeerInfo>);
				try {
					await peerPool.request({ procedure: 'proc', data: 123 });
				} catch (err) {
					caughtError = err;
				}
			});

			it('should call _peerSelectForRequest with all the necessary options', async () => {
				expect((peerPool as any)._peerSelectForRequest).to.be.calledWith({
					peers: [],
					nodeInfo: peerPool.nodeInfo,
					peerLimit: 1,
					requestPacket: { procedure: 'proc', data: 123 },
				});
			});

			it('should throw an error', async () => {
				expect(caughtError).to.not.be.null;
				expect(caughtError)
					.to.have.property('name')
					.which.equals('RequestFailError');
			});
		});

		describe('when peers are found', () => {
			it('should not throw an error');
		});
	});

	describe('#send', () => {
		beforeEach(async () => {
			(peerPool['_peerSelectForSend'] as any) = sandbox
				.stub()
				.returns([] as ReadonlyArray<P2PPeerInfo>);
			peerPool.send({ event: 'foo', data: 123 });
		});

		it('should call _peerSelectForSend with all the necessary options', async () => {
			expect(peerPool['_peerSelectForSend']).to.be.calledWith({
				peers: [],
				nodeInfo: peerPool.nodeInfo,
				peerLimit: DEFAULT_SEND_PEER_LIMIT,
				messagePacket: { event: 'foo', data: 123 },
			});
		});
	});

	describe('#triggerNewConnections', () => {
		beforeEach(async () => {
			(peerPool['_peerSelectForConnection'] as any) = sandbox
				.stub()
				.returns([] as ReadonlyArray<P2PPeerInfo>);
			sandbox.stub(peerPool, 'getPeersCountPerKind').returns({
				outboundCount: 0,
				inboundCount: 0,
			});
			peerPool.triggerNewConnections([], [], []);
		});

		it('should call _peerSelectForConnection with all the necessary options', async () => {
			expect(peerPool['_peerSelectForConnection']).to.be.calledWith({
				newPeers: [],
				triedPeers: [],
				nodeInfo: peerPool.nodeInfo,
				peerLimit: DEFAULT_MAX_OUTBOUND_CONNECTIONS,
			});
		});
	});

	describe('#getAllConnectedPeerInfos', () => {
		describe('when there are some active peers in inbound and outbound', () => {
			const peerList: ReadonlyArray<Peer> = initializePeerList();
			let activePeersInfoList: ReadonlyArray<P2PPeerInfo>;

			beforeEach(async () => {
				sandbox.stub(peerList[0], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[1], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[2], 'state').get(() => ConnectionState.CLOSED);

				sandbox
					.stub(peerPool, 'getConnectedPeers')
					.returns(
						peerList.filter(peer => peer.state === ConnectionState.OPEN),
					);
				activePeersInfoList = [peerList[0], peerList[1]].map(
					peer => peer.peerInfo,
				);
			});

			it('should returns list of peerInfos of active peers', async () => {
				expect(peerPool.getAllConnectedPeerInfos()).eql(activePeersInfoList);
			});
		});

		describe('when there are some active peers in inbound only', () => {
			const peerList: ReadonlyArray<Peer> = initializePeerList();
			let activePeersInfoList: ReadonlyArray<P2PPeerInfo>;

			beforeEach(async () => {
				sandbox.stub(peerList[0], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[1], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[2], 'state').get(() => ConnectionState.CLOSED);

				sandbox
					.stub(peerPool, 'getConnectedPeers')
					.returns(
						peerList.filter(peer => peer.state === ConnectionState.OPEN),
					);
				activePeersInfoList = [peerList[0], peerList[1]].map(
					peer => peer.peerInfo,
				);
			});

			it('should returns list of peerInfos of active peers only in inbound', async () => {
				expect(peerPool.getAllConnectedPeerInfos()).eql(activePeersInfoList);
			});
		});

		describe('when there are some active peers in outbound only', () => {
			const peerList: ReadonlyArray<Peer> = initializePeerList();
			let activePeersInfoList: ReadonlyArray<P2PPeerInfo>;

			beforeEach(async () => {
				sandbox.stub(peerList[0], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[1], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[2], 'state').get(() => ConnectionState.CLOSED);

				sandbox
					.stub(peerPool, 'getConnectedPeers')
					.returns(
						peerList.filter(peer => peer.state === ConnectionState.OPEN),
					);
				activePeersInfoList = [peerList[0], peerList[1]].map(
					peer => peer.peerInfo,
				);
			});

			it('should returns list of peerInfos of active peers only in outbound', async () => {
				expect(peerPool.getAllConnectedPeerInfos()).eql(activePeersInfoList);
			});
		});

		describe('when there are no active peers', () => {
			const peerList: ReadonlyArray<Peer> = initializePeerList();

			beforeEach(async () => {
				peerList.forEach(peer =>
					sandbox.stub(peer, 'state').get(() => ConnectionState.CLOSED),
				);

				sandbox
					.stub(peerPool, 'getConnectedPeers')
					.returns(
						peerList.filter(peer => peer.state === ConnectionState.OPEN),
					);
			});

			it('should return an empty array', async () => {
				expect(peerPool.getAllConnectedPeerInfos()).eql([]);
			});
		});
	});

	describe('#getUniqueOutboundConnectedPeers', () => {
		const samplePeers = initializePeerInfoList();

		describe('when two peers have same peer infos', () => {
			let uniqueOutboundConnectedPeers: ReadonlyArray<P2PDiscoveredPeerInfo>;

			beforeEach(async () => {
				const duplicatesList = [...samplePeers, samplePeers[0], samplePeers[1]];
				sandbox
					.stub(peerPool, 'getAllConnectedPeerInfos')
					.returns(duplicatesList);
				uniqueOutboundConnectedPeers = peerPool.getUniqueOutboundConnectedPeers();
			});

			it('should remove the duplicate peers with the same ips', async () => {
				expect(uniqueOutboundConnectedPeers).eql(samplePeers);
			});
		});

		describe('when two peers have same IP and different wsPort and height', () => {
			let uniqueOutboundConnectedPeers: ReadonlyArray<P2PDiscoveredPeerInfo>;

			beforeEach(async () => {
				const peer1 = {
					...samplePeers[0],
					height: 1212,
					wsPort: samplePeers[0].wsPort + 1,
				};

				const peer2 = {
					...samplePeers[1],
					height: 1200,
					wsPort: samplePeers[1].wsPort + 1,
				};

				const duplicatesList = [...samplePeers, peer1, peer2];
				sandbox
					.stub(peerPool, 'getAllConnectedPeerInfos')
					.returns(duplicatesList);
				uniqueOutboundConnectedPeers = peerPool.getUniqueOutboundConnectedPeers();
			});

			it('should remove the duplicate ip and choose the one with higher height', async () => {
				expect(uniqueOutboundConnectedPeers).eql(samplePeers);
			});
		});

		describe('when two peers have same IP and different wsPort but same height', () => {
			let uniqueOutboundConnectedPeers: ReadonlyArray<P2PDiscoveredPeerInfo>;

			beforeEach(async () => {
				const peer1 = {
					...samplePeers[0],
					height: samplePeers[0].height,
					wsPort: samplePeers[0].wsPort + 1,
				};

				const peer2 = {
					...samplePeers[1],
					height: samplePeers[1].height,
					wsPort: samplePeers[1].wsPort + 1,
				};

				const duplicatesList = [...samplePeers, peer1, peer2];
				sandbox
					.stub(peerPool, 'getAllConnectedPeerInfos')
					.returns(duplicatesList);
				uniqueOutboundConnectedPeers = peerPool.getUniqueOutboundConnectedPeers();
			});

			it('should remove the duplicate ip and choose one of the peer in sequence', async () => {
				expect(uniqueOutboundConnectedPeers).eql(samplePeers);
			});
		});
	});
});
