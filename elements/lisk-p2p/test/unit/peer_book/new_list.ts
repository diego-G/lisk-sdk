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
import { NewList, NewListConfig } from '../../../src/peer_book/new_list';
import { P2PEnhancedPeerInfo } from '../../../src/p2p_types';
import {
	initPeerInfoListWithSuffix,
	initPeerInfoList,
} from '../../utils/peers';
import { PEER_TYPE } from '../../../src/utils';
import {
	DEFAULT_NEW_BUCKET_COUNT,
	DEFAULT_NEW_BUCKET_SIZE,
	DEFAULT_RANDOM_SECRET,
	DEFAULT_EVICTION_THRESHOLD_TIME,
} from '../../../src/constants';

describe('New Peers List', () => {
	let newPeerConfig: NewListConfig;
	let newPeersList: NewList;

	describe('#constructor', () => {
		beforeEach(() => {
			newPeerConfig = {
				bucketSize: DEFAULT_NEW_BUCKET_SIZE,
				numOfBuckets: DEFAULT_NEW_BUCKET_COUNT,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.NEW_PEER,
				evictionThresholdTime: DEFAULT_EVICTION_THRESHOLD_TIME,
			};
			newPeersList = new NewList(newPeerConfig);
		});

		it(`should set properties correctly and create a map of ${DEFAULT_NEW_BUCKET_COUNT} size with ${DEFAULT_NEW_BUCKET_COUNT} buckets each`, () => {
			expect(newPeersList.newPeerConfig).to.be.eql(newPeerConfig);
			expect(newPeersList.newPeerConfig.bucketSize).to.be.equal(
				DEFAULT_NEW_BUCKET_SIZE,
			);
			expect(newPeersList.newPeerConfig.numOfBuckets).to.be.equal(
				DEFAULT_NEW_BUCKET_COUNT,
			);
		});
	});

	describe('#newPeerConfig', () => {
		beforeEach(() => {
			newPeerConfig = {
				bucketSize: DEFAULT_NEW_BUCKET_SIZE,
				numOfBuckets: DEFAULT_NEW_BUCKET_COUNT,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.NEW_PEER,
				evictionThresholdTime: DEFAULT_EVICTION_THRESHOLD_TIME,
			};
			newPeersList = new NewList(newPeerConfig);
		});

		it('should get new peer config', () => {
			expect(newPeersList.newPeerConfig).to.eql({
				...(newPeersList as any).peerListConfig,
				evictionThresholdTime: DEFAULT_EVICTION_THRESHOLD_TIME,
			});
		});
	});

	describe('#makeSpace', () => {
		let samplePeers: ReadonlyArray<any>;
		let clock: sinon.SinonFakeTimers;
		let bucket: Map<string, P2PEnhancedPeerInfo>;
		let calculateBucketStub: any;
		beforeEach(() => {
			clock = sandbox.useFakeTimers();
			samplePeers = initPeerInfoList().map(peerInfo => ({
				...peerInfo,
				dateAdded: new Date(),
			}));
			newPeersList = new NewList({
				bucketSize: 3,
				numOfBuckets: 1,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.TRIED_PEER,
			});
			bucket = new Map<string, P2PEnhancedPeerInfo>();
			bucket.set(samplePeers[1].peerId, samplePeers[2]);
			calculateBucketStub = sandbox.stub(newPeersList, 'calculateBucket');
		});

		describe('when bucket is full', () => {
			describe('when bucket contains old peers', () => {
				it('should evict just one of them', () => {
					clock.tick(DEFAULT_EVICTION_THRESHOLD_TIME + 1);
					calculateBucketStub.returns({ bucketId: 0, bucket });
					const evictedPeer = newPeersList.makeSpace(bucket);

					expect(evictedPeer as any).to.be.eql(samplePeers[2]);
				});
			});

			describe('when bucket does not contain old peers', () => {
				it('should evict one peer randomly', () => {
					const evictedPeer = newPeersList.makeSpace(bucket);

					expect(samplePeers).to.include(evictedPeer as any);
				});
			});
		});

		describe('when bucket is not full', () => {
			it('should not evict any peer', () => {
				bucket = new Map<string, P2PEnhancedPeerInfo>();
				const evictedPeer = newPeersList.makeSpace(bucket);

				expect(evictedPeer).to.be.undefined;
			});
		});
	});

	describe('when there is a large sample of peers', () => {
		let clock: sinon.SinonFakeTimers;
		const samplePeersA = initPeerInfoListWithSuffix(
			'1.222.123',
			DEFAULT_NEW_BUCKET_SIZE * DEFAULT_NEW_BUCKET_COUNT * 2,
		);
		const samplePeersB = initPeerInfoListWithSuffix(
			'234.11.34',
			DEFAULT_NEW_BUCKET_SIZE * DEFAULT_NEW_BUCKET_COUNT * 2,
		);

		beforeEach(() => {
			clock = sandbox.useFakeTimers();
			newPeerConfig = {
				bucketSize: DEFAULT_NEW_BUCKET_SIZE,
				numOfBuckets: DEFAULT_NEW_BUCKET_COUNT,
				secret: DEFAULT_RANDOM_SECRET,
				peerType: PEER_TYPE.NEW_PEER,
				evictionThresholdTime: 600000,
			};

			newPeersList = new NewList(newPeerConfig);

			samplePeersA.forEach(peerInfo => {
				clock.tick(2);
				newPeersList.addPeer(peerInfo);
			});

			clock.tick(600000);

			samplePeersB.forEach(peerInfo => {
				clock.tick(2);
				newPeersList.addPeer(peerInfo);
			});
		});

		it(`should not allow newPeer list to grow beyond ${DEFAULT_NEW_BUCKET_SIZE *
			DEFAULT_NEW_BUCKET_COUNT} peers`, () => {
			expect(newPeersList.peerList.length).to.be.lte(
				DEFAULT_NEW_BUCKET_SIZE * DEFAULT_NEW_BUCKET_COUNT,
			);
		});
	});
});
