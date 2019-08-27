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
	NewPeers,
	DEFAULT_NEW_BUCKET_SIZE,
	DEFAULT_NEW_BUCKET_COUNT,
} from '../../../src/peer_directory/new_peers';
import { initializePeerInfoList } from '../../utils/peers';
import { P2PPeerInfo } from '../../../src/p2p_types';
import { PEER_TYPE } from '../../../src/utils';

describe('newPeer', () => {
	const newPeerConfig = {
		peerBucketSize: DEFAULT_NEW_BUCKET_SIZE,
		peerBucketCount: DEFAULT_NEW_BUCKET_COUNT,
		secret: 123456,
		peerType: PEER_TYPE.NEW_PEER,
		evictionThresholdTime: 86400000,
	};

	describe('#constructor', () => {
		let newPeersList: NewPeers;

		beforeEach(async () => {
			newPeersList = new NewPeers(newPeerConfig);
		});

		it('should set properties correctly and create a map of 64 size with 32 buckets each', async () => {
			expect(newPeersList.newPeerConfig).to.be.eql(newPeerConfig);
			expect(newPeersList.newPeerConfig.peerBucketCount).to.be.equal(128);
			expect(newPeersList.newPeerConfig.peerBucketSize).to.be.equal(32);
		});
	});

	describe('#addPeer', () => {
		let newPeersList: NewPeers;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			newPeersList = new NewPeers(newPeerConfig);
			newPeersList.addPeer(samplePeers[0]);
		});

		it('should add the incoming peer when it does not exist already', async () => {
			expect(newPeersList.getPeer(samplePeers[0])).eql(samplePeers[0]);
		});

		it('should not add the incoming peer if it exists', async () => {
			expect(newPeersList.addPeer(samplePeers[0]))
				.to.be.an('object')
				.haveOwnProperty('success').to.be.false;
		});
	});

	describe('#getNewPeersList', () => {
		const samplePeers = initializePeerInfoList();
		let newPeersList: NewPeers;
		let newPeersArray: ReadonlyArray<P2PPeerInfo>;

		beforeEach(async () => {
			newPeersList = new NewPeers(newPeerConfig);
			newPeersList.addPeer(samplePeers[0]);
			newPeersList.addPeer(samplePeers[1]);
			newPeersList.addPeer(samplePeers[2]);
			newPeersArray = newPeersList.peersList();
		});

		it('should return new peers list', async () => {
			const expectedNewPeersArray = [
				samplePeers[0],
				samplePeers[1],
				samplePeers[2],
			];
			expect(newPeersArray).to.have.members(expectedNewPeersArray);
		});
	});

	describe('#removePeer', () => {
		let newPeersList: NewPeers;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			newPeersList = new NewPeers(newPeerConfig);
			newPeersList.addPeer(samplePeers[0]);
			newPeersList.addPeer(samplePeers[1]);
		});

		it('should remove the peer from the incoming peerInfo', async () => {
			newPeersList.removePeer(samplePeers[0]);
			expect(newPeersList.getPeer(samplePeers[0])).to.be.undefined;
		});
	});

	describe('#getPeer', () => {
		let newPeersList: NewPeers;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			newPeersList = new NewPeers(newPeerConfig);
			newPeersList.addPeer(samplePeers[0]);
			newPeersList.addPeer(samplePeers[1]);
		});

		describe('when peer exists in the triedPeers peerMap', () => {
			it('should get the peer from the incoming peerId', async () => {
				expect(newPeersList.getPeer(samplePeers[0]))
					.to.be.an('object')
					.and.eql(samplePeers[0]);
			});
		});

		describe('when peer does not exist in the triedPeers peerMap', () => {
			const randomPeer = initializePeerInfoList()[2];
			it('should return undefined for the given peer that does not exist in peerMap', async () => {
				expect(newPeersList.getPeer(randomPeer)).to.be.undefined;
			});
		});
	});

	describe('#updatePeer', () => {
		let newPeersList: NewPeers;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			newPeersList = new NewPeers(newPeerConfig);
			newPeersList.addPeer(samplePeers[0]);
			newPeersList.addPeer(samplePeers[1]);
		});

		describe('when trying to update a peer that exist', () => {
			it('should update the peer from the incoming peerInfo', async () => {
				let updatedPeer = {
					...samplePeers[0],
					height: 0,
					version: '1.2.3',
				};

				const success = newPeersList.updatePeer(updatedPeer);
				expect(success).to.be.true;
				expect(newPeersList.getPeer(samplePeers[0])).to.be.eql(updatedPeer);
			});
		});

		describe('when trying to update a peer that does not exist', () => {
			it('should return false when the peer does not exist', async () => {
				let updatedPeer = {
					...samplePeers[2],
					height: 0,
					version: '1.2.3',
				};

				const success = newPeersList.updatePeer(updatedPeer);
				expect(success).to.be.false;
			});
		});
	});

	describe('#findPeer', () => {
		let newPeersList: NewPeers;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			newPeersList = new NewPeers(newPeerConfig);
			newPeersList.addPeer(samplePeers[0]);
			newPeersList.addPeer(samplePeers[1]);
		});

		describe('when the peer exist', () => {
			it('should find the peer from the incoming peerInfo', async () => {
				const peer = newPeersList.getPeer(samplePeers[0]);
				expect(peer).eql(samplePeers[0]);
			});
		});

		describe('when the peer does not exist', () => {
			it('should return false when the peer does not exist', async () => {
				const success = newPeersList.updatePeer(samplePeers[2]);
				expect(success).to.be.false;
			});
		});
	});

	describe('#failedConnectionAction', () => {
		let newPeersList: NewPeers;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			newPeersList = new NewPeers(newPeerConfig);
			newPeersList.addPeer(samplePeers[0]);
			newPeersList.addPeer(samplePeers[1]);
		});

		describe('when the peer exist and applied failedConnectionAction', () => {
			it('should delete the peer and for the second call it should return false', async () => {
				const success1 = newPeersList.failedConnectionAction(samplePeers[0]);
				expect(success1).to.be.true;
				const success2 = newPeersList.failedConnectionAction(samplePeers[0]);
				expect(success2).to.be.false;
			});
		});
	});

	describe.only('#evictionRandomly', () => {
		const newPeerConfig = {
			peerBucketSize: 2,
			peerBucketCount: 2,
			secret: 123456,
			peerType: PEER_TYPE.NEW_PEER,
			evictionThresholdTime: 86400000,
		};
		const samplePeers = initializePeerInfoList();

		let newPeersList = new NewPeers(newPeerConfig);
		// Modify getBucketId function to only return buckets in range
		newPeersList['getBucketId'] = () => Math.floor(Math.random() * 2);
		newPeersList.addPeer(samplePeers[0]);
		newPeersList.addPeer(samplePeers[1]);

		// Now capture the evicted peers from addition of new Peers
		const evictionResult1 = newPeersList.addPeer(samplePeers[2]);
		const evictionResult2 = newPeersList.addPeer(samplePeers[3]);
		const evictionResult3 = newPeersList.addPeer(samplePeers[4]);

		it('should evict atleast one peer from the peerlist based on random eviction', async () => {
			const evictionResultAfterAddition = [
				evictionResult1,
				evictionResult2,
				evictionResult3,
			].map(result => result.isEvicted);
			expect(evictionResultAfterAddition).includes(true);
		});

		it('should remove the evicted peers from the peer list', async () => {
			const evictedPeersAfterAddition = [
				evictionResult1,
				evictionResult2,
				evictionResult3,
			]
				.filter(result => result.isEvicted)
				.map(trueEvictionResult => trueEvictionResult.evictedPeer);
			expect(evictedPeersAfterAddition).not.members(newPeersList.peersList());
		});
	});
});
