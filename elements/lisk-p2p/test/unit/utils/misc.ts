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
import { initializePeerInfoList } from '../../utils/peers';
import {
	getIPGroup,
	isPrivate,
	isLocal,
	getNetwork,
	getIPBytes,
	getNetgroup,
	getBucket,
	getUniquePeersbyIp,
	NETWORK,
	PEER_TYPE,
	convertNodeInfoToLegacyFormat,
} from '../../../src/utils';
import { P2PDiscoveredPeerInfo, P2PNodeInfo } from '../../../src/p2p_types';

describe('utils/misc', () => {
	const IPv4Address = '1.160.10.240';
	const privateAddress = '10.0.0.0';
	const localAddress = '127.0.0.1';
	const secret = 123456;
	const MAX_GROUP_NUM = 255;
	const MAX_NEW_BUCKETS = 128;
	const MAX_TRIED_BUCKETS = 64;
	const MAX_PEER_ADDRESSES = 65025;

	describe('#getIPGroup', () => {
		it('should return first group when passing 0 in second argument', () => {
			const byte = getIPGroup(IPv4Address, 0);
			return expect(byte).to.eql(1);
		});

		it('should throw an error for second argument greater than 3', () => {
			try {
				getIPGroup(IPv4Address, 4);
			} catch (err) {
				expect(err).to.have.property('message', 'Invalid IP group.');
			}
		});
	});

	describe('#getIPBytes', () => {
		it('should return an object with property groupABytes', () => {
			return expect(getIPBytes(IPv4Address)).to.have.property('aBytes');
		});

		it('should return an object with property groupBBytes', () => {
			return expect(getIPBytes(IPv4Address)).to.have.property('bBytes');
		});

		it('should return an object with property groupBBytes', () => {
			return expect(getIPBytes(IPv4Address)).to.have.property('cBytes');
		});

		it('should return an object with property groupBBytes', () => {
			return expect(getIPBytes(IPv4Address)).to.have.property('dBytes');
		});
	});

	describe('#isPrivate', () => {
		it('should return true for private IP address', () => {
			return expect(isPrivate(privateAddress)).to.be.true;
		});
	});

	describe('#isLocal', () => {
		it('should return true for local IP address', () => {
			return expect(isLocal(localAddress)).to.be.true;
		});
	});

	describe('#getNetwork', () => {
		it(`should return ${NETWORK.NET_IPV4} for IPv4 address`, () => {
			return expect(getNetwork(IPv4Address)).to.eql(NETWORK.NET_IPV4);
		});

		it(`should return ${NETWORK.NET_PRIVATE} for private address`, () => {
			return expect(getNetwork(privateAddress)).to.eql(NETWORK.NET_PRIVATE);
		});

		it(`should return ${NETWORK.NET_LOCAL} for local address`, () => {
			return expect(getNetwork(localAddress)).to.eql(NETWORK.NET_LOCAL);
		});
	});

	describe('#getNetgroup', () => {
		it('should return a number netgroup', () => {
			return expect(getNetgroup(IPv4Address, secret)).to.be.a('number');
		});

		it('should return different netgroup for different addresses', () => {
			const secondIPv4Address = '1.161.10.240';
			const firstNetgroup = getNetgroup(IPv4Address, secret);
			const secondNetgroup = getNetgroup(secondIPv4Address, secret);

			return expect(firstNetgroup).to.not.eql(secondNetgroup);
		});

		it('should return same netgroup for unique local addresses', () => {
			const firstNetgroup = getNetgroup(localAddress, secret);
			const secondLocalAddress = '127.0.1.1';
			const secondNetgroup = getNetgroup(secondLocalAddress, secret);

			return expect(firstNetgroup).to.eql(secondNetgroup);
		});

		it('should return same netgroup for unique private addresses', () => {
			const firstNetgroup = getNetgroup(privateAddress, secret);
			const secondPrivateAddress = '10.0.0.1';
			const secondNetgroup = getNetgroup(secondPrivateAddress, secret);

			return expect(firstNetgroup).to.eql(secondNetgroup);
		});

		it('should return different netgroups for local and private addresses', () => {
			const firstNetgroup = getNetgroup(localAddress, secret);
			const secondNetgroup = getNetgroup(privateAddress, secret);

			return expect(firstNetgroup).to.not.eql(secondNetgroup);
		});
	});

	describe('#getBucket', () => {
		it('should return a bucket number', () => {
			return expect(
				getBucket({
					secret,
					targetAddress: IPv4Address,
					peerType: PEER_TYPE.NEW_PEER,
				}),
			).to.be.a('number');
		});

		it('should return different buckets for different target addresses', () => {
			const secondIPv4Address = '1.161.10.240';
			const firstBucket = getBucket({
				secret,
				targetAddress: IPv4Address,
				peerType: PEER_TYPE.NEW_PEER,
			});
			const secondBucket = getBucket({
				secret,
				targetAddress: secondIPv4Address,
				peerType: PEER_TYPE.NEW_PEER,
			});

			return expect(firstBucket).to.not.eql(secondBucket);
		});

		it('should return same bucket for unique local target addresses', () => {
			const firstBucket = getBucket({
				secret,
				targetAddress: localAddress,
				peerType: PEER_TYPE.NEW_PEER,
			});
			const secondLocalAddress = '127.0.1.1';
			const secondBucket = getBucket({
				secret,
				targetAddress: secondLocalAddress,
				peerType: PEER_TYPE.NEW_PEER,
			});

			return expect(firstBucket).to.eql(secondBucket);
		});

		it('should return same bucket for unique private target addresses', () => {
			const firstBucket = getBucket({
				secret,
				targetAddress: privateAddress,
				peerType: PEER_TYPE.NEW_PEER,
			});
			const secondPrivateAddress = '10.0.0.1';
			const secondBucket = getBucket({
				secret,
				targetAddress: secondPrivateAddress,
				peerType: PEER_TYPE.NEW_PEER,
			});

			return expect(firstBucket).to.eql(secondBucket);
		});

		it('should return different buckets for local and private target addresses', () => {
			const firstBucket = getBucket({
				secret,
				targetAddress: localAddress,
				peerType: PEER_TYPE.NEW_PEER,
			});
			const secondBucket = getBucket({
				secret,
				targetAddress: privateAddress,
				peerType: PEER_TYPE.NEW_PEER,
			});

			return expect(firstBucket).to.not.eql(secondBucket);
		});

		it('should return the same bucket given random ip addresses in the same group for new peers', async () => {
			const collectedBuckets = new Array(MAX_GROUP_NUM)
				.fill(0)
				.map(() => '61.26.254.' + Math.floor(Math.random() * 256))
				.map(address =>
					getBucket({
						secret,
						targetAddress: address,
						peerType: PEER_TYPE.NEW_PEER,
					}),
				);
			const firstBucket = collectedBuckets[0];
			expect(collectedBuckets.every(bucket => bucket === firstBucket)).to.be
				.true;
		});

		it('should return an even distribution of peers in each bucket given random ip addresses in different groups for tried peers', async () => {
			const expectedPeerCountPerBucketLowerBound =
				(MAX_PEER_ADDRESSES / MAX_TRIED_BUCKETS) * 0.4;
			const expectedPeerCountPerBucketUpperBound =
				(MAX_PEER_ADDRESSES / MAX_TRIED_BUCKETS) * 1.7;
			const collectedBuckets = new Array(MAX_PEER_ADDRESSES)
				.fill(0)
				.reduce((collectedBuckets: any) => {
					const targetAddress = `${Math.floor(
						Math.random() * 256,
					)}.${Math.floor(Math.random() * 256)}.254.1`;
					const bucket = getBucket({
						secret,
						targetAddress,
						peerType: PEER_TYPE.TRIED_PEER,
					});
					if (!collectedBuckets[bucket]) {
						collectedBuckets[bucket] = 0;
					}
					collectedBuckets[bucket]++;

					return collectedBuckets;
				}, {});

			Object.values(collectedBuckets).forEach((bucketCount: any) => {
				expect(bucketCount).to.be.greaterThan(
					expectedPeerCountPerBucketLowerBound,
				);
				expect(bucketCount).to.be.lessThan(
					expectedPeerCountPerBucketUpperBound,
				);
			});
		});

		// The bounds are more tolerant here due to our temporary solution to not include source IP changing the outcome of distribution
		it('should return an even distribution of peers in each bucket given random ip addresses in different groups for new peers', async () => {
			const expectedPeerCountPerBucketLowerBound =
				(MAX_PEER_ADDRESSES / MAX_NEW_BUCKETS) * 0.2;
			const expectedPeerCountPerBucketUpperBound =
				(MAX_PEER_ADDRESSES / MAX_NEW_BUCKETS) * 2.7;
			const collectedBuckets = new Array(MAX_PEER_ADDRESSES)
				.fill(0)
				.reduce((collectedBuckets: any) => {
					const targetAddress = `${Math.floor(
						Math.random() * 256,
					)}.${Math.floor(Math.random() * 256)}.254.1`;
					const bucket = getBucket({
						secret,
						targetAddress,
						peerType: PEER_TYPE.NEW_PEER,
					});
					if (!collectedBuckets[bucket]) {
						collectedBuckets[bucket] = 0;
					}
					collectedBuckets[bucket]++;

					return collectedBuckets;
				}, {});
			Object.values(collectedBuckets).forEach((bucketCount: any) => {
				expect(bucketCount).to.be.greaterThan(
					expectedPeerCountPerBucketLowerBound,
				);
				expect(bucketCount).to.be.lessThan(
					expectedPeerCountPerBucketUpperBound,
				);
			});
		});
	});

	describe('#getUniquePeersbyIp', () => {
		const samplePeers = initializePeerInfoList();

		describe('when two peers have same peer infos', () => {
			let uniquePeerListByIp: ReadonlyArray<P2PDiscoveredPeerInfo>;

			beforeEach(async () => {
				const duplicatesList = [...samplePeers, samplePeers[0], samplePeers[1]];
				uniquePeerListByIp = getUniquePeersbyIp(duplicatesList);
			});

			it('should remove the duplicate peers with the same ips', async () => {
				expect(uniquePeerListByIp).eql(samplePeers);
			});
		});

		describe('when two peers have same IP and different wsPort and height', () => {
			let uniquePeerListByIp: ReadonlyArray<P2PDiscoveredPeerInfo>;

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
				uniquePeerListByIp = getUniquePeersbyIp(duplicatesList);
			});

			it('should remove the duplicate ip and choose the one with higher height', async () => {
				expect(uniquePeerListByIp).eql(samplePeers);
			});
		});

		describe('when two peers have same IP and different wsPort but same height', () => {
			let uniquePeerListByIp: ReadonlyArray<P2PDiscoveredPeerInfo>;

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
				uniquePeerListByIp = getUniquePeersbyIp(duplicatesList);
			});

			it('should remove the duplicate ip and choose one of the peer with same ip in sequence', async () => {
				expect(uniquePeerListByIp).eql(samplePeers);
			});
		});
	});

	describe('#convertNodeInfoToLegacyFormat', () => {
		describe('when node info has broadhash, nonce and httpPort', () => {
			const nodeInfo = {
				os: 'os',
				version: '1.2.0',
				protocolVersion: '1.2',
				nethash: 'nethash',
				wsPort: 6001,
				height: 100,
				broadhash: 'myBroadhash',
				nonce: 'myNonce',
				httpPort: 8888,
			} as P2PNodeInfo;

			it('should return object containing broadhash property as a non-empty string', async () => {
				expect(convertNodeInfoToLegacyFormat(nodeInfo))
					.to.haveOwnProperty('broadhash')
					.to.eql(nodeInfo.broadhash as string);
			});

			it('should return object containing nonce property as a non-empty string', async () => {
				expect(convertNodeInfoToLegacyFormat(nodeInfo))
					.to.haveOwnProperty('nonce')
					.to.eql(nodeInfo.nonce as string);
			});

			it('should return object containing httpPort property as a number', async () => {
				expect(convertNodeInfoToLegacyFormat(nodeInfo))
					.to.haveOwnProperty('nonce')
					.to.eql(nodeInfo.nonce as string);
			});
		});

		describe('when node info has neither broadhash, nor nonce, nor httpPort', () => {
			const nodeInfo = {
				os: 'os',
				version: '1.2.0',
				protocolVersion: '1.2',
				nethash: 'nethash',
				wsPort: 6001,
				height: 100,
			} as P2PNodeInfo;

			it('should return object containing broadhash property as an empty string', async () => {
				expect(convertNodeInfoToLegacyFormat(nodeInfo)).to.haveOwnProperty(
					'broadhash',
				).to.be.empty;
			});

			it('should return object containing nonce property as an empty string', async () => {
				expect(convertNodeInfoToLegacyFormat(nodeInfo)).to.haveOwnProperty(
					'nonce',
				).to.be.empty;
			});

			it('should return object containing httpPort property with zero value', async () => {
				expect(convertNodeInfoToLegacyFormat(nodeInfo))
					.to.haveOwnProperty('httpPort')
					.to.be.equal(0);
			});
		});
	});
});
