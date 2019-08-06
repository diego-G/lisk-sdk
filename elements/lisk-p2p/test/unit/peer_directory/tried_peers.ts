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
 *
 */
import { expect } from 'chai';
import { TriedPeers } from '../../../src/peer_directory/tried_peers';
import { initializePeerInfoList } from '../../utils/peers';
import { constructPeerIdFromPeerInfo } from '../../../src/utils';

describe.only('triedPeer', () => {
	describe('#constructor', () => {
		let triedPeersList: TriedPeers;
		const triedPeerConfig = {
			maxReconnectTries: 3,
			triedPeerBucketSize: 32,
			triedPeerListSize: 64,
		};

		beforeEach(async () => {
			triedPeersList = new TriedPeers(triedPeerConfig);
		});

		it('should set properties correctly and create a map of 64 size with 32 buckets each', async () => {
			expect(triedPeersList.triedPeerConfig).to.be.eql(triedPeerConfig);
			expect(triedPeersList.triedPeerMap.size).to.be.equal(64);
			expect(triedPeersList.triedPeerConfig.triedPeerBucketSize).to.be.equal(
				32,
			);
		});
	});

	describe('#addPeer', () => {
		let triedPeersList: TriedPeers;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			const triedPeerConfig = {
				maxReconnectTries: 3,
				triedPeerBucketSize: 32,
				triedPeerListSize: 64,
			};

			triedPeersList = new TriedPeers(triedPeerConfig);
			triedPeersList.addPeer(samplePeers[0]);
		});

		it('should add the incoming peer if it does not exist already', async () => {
			expect(triedPeersList.findPeer(samplePeers[0])).to.be.true;
		});

		it('should not add the incoming peer if it exists', async () => {
			expect(triedPeersList.addPeer(samplePeers[0])).to.be.undefined;
		});
	});

	describe('#removePeer', () => {
		let triedPeersList: TriedPeers;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			const triedPeerConfig = {
				maxReconnectTries: 3,
				triedPeerBucketSize: 32,
				triedPeerListSize: 64,
			};

			triedPeersList = new TriedPeers(triedPeerConfig);
			triedPeersList.addPeer(samplePeers[0]);
			triedPeersList.addPeer(samplePeers[1]);
		});

		it('should remove the peer from the incoming peerInfo', async () => {
			triedPeersList.removePeer(samplePeers[0]);
			expect(triedPeersList.findPeer(samplePeers[0])).to.be.false;
		});
	});

	describe('#getPeer', () => {
		let triedPeersList: TriedPeers;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			const triedPeerConfig = {
				maxReconnectTries: 3,
				triedPeerBucketSize: 32,
				triedPeerListSize: 64,
			};

			triedPeersList = new TriedPeers(triedPeerConfig);
			triedPeersList.addPeer(samplePeers[0]);
			triedPeersList.addPeer(samplePeers[1]);
		});
		describe('when peer exists in the triedPeers peerMap', () => {
			it('should get the peer from the incoming peerId', async () => {
				expect(
					triedPeersList.getPeer(constructPeerIdFromPeerInfo(samplePeers[0])),
				)
					.to.be.an('object')
					.and.eql(samplePeers[0]);
			});
		});

		describe('when peer does not exist in the triedPeers peerMap', () => {
			const randomPeer = initializePeerInfoList()[2];
			it('should return undefined for the given peer that does not exist in peerMap', async () => {
				expect(triedPeersList.getPeer(constructPeerIdFromPeerInfo(randomPeer)))
					.to.be.undefined;
			});
		});
	});

	describe('#updatePeer', () => {
		let triedPeersList: TriedPeers;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			const triedPeerConfig = {
				maxReconnectTries: 3,
				triedPeerBucketSize: 32,
				triedPeerListSize: 64,
			};

			triedPeersList = new TriedPeers(triedPeerConfig);
			triedPeersList.addPeer(samplePeers[0]);
			triedPeersList.addPeer(samplePeers[1]);
		});
		describe('when trying to update a peer that exist', () => {
			it('should update the peer from the incoming peerInfo', async () => {
				let updatedPeer = {
					...samplePeers[0],
					height: 0,
					version: '1.2.3',
				};

				const success = triedPeersList.updatePeer(updatedPeer);
				expect(success).to.be.true;
				expect(
					triedPeersList.getPeer(constructPeerIdFromPeerInfo(samplePeers[0])),
				).to.be.eql(updatedPeer);
			});
		});

		describe('when trying to update a peer that does not exist', () => {
			it('should return false when the peer does not exist', async () => {
				let updatedPeer = {
					...samplePeers[2],
					height: 0,
					version: '1.2.3',
				};

				const success = triedPeersList.updatePeer(updatedPeer);
				expect(success).to.be.false;
			});
		});
	});

	describe('#findPeer', () => {
		let triedPeersList: TriedPeers;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			const triedPeerConfig = {
				maxReconnectTries: 3,
				triedPeerBucketSize: 32,
				triedPeerListSize: 64,
			};

			triedPeersList = new TriedPeers(triedPeerConfig);
			triedPeersList.addPeer(samplePeers[0]);
			triedPeersList.addPeer(samplePeers[1]);
		});
		describe('when the peer exist', () => {
			it('should find the peer from the incoming peerInfo', async () => {
				const success = triedPeersList.findPeer(samplePeers[0]);
				expect(success).to.be.true;
			});
		});

		describe('when the peer does not exist', () => {
			it('should return false when the peer does not exist', async () => {
				const success = triedPeersList.updatePeer(samplePeers[2]);
				expect(success).to.be.false;
			});
		});
	});

	describe('#failedConnectionAction', () => {
		let triedPeersList: TriedPeers;
		const samplePeers = initializePeerInfoList();

		describe('when maxReconnectTries is 1', () => {
			beforeEach(async () => {
				const triedPeerConfig = {
					maxReconnectTries: 1,
					triedPeerBucketSize: 32,
					triedPeerListSize: 64,
				};

				triedPeersList = new TriedPeers(triedPeerConfig);
				triedPeersList.addPeer(samplePeers[0]);
			});

			it('should remove the peer from the triedPeerList', async () => {
				const success = triedPeersList.failedConnectionAction(samplePeers[0]);
				expect(success).to.be.true;
				expect(
					triedPeersList.getPeer(constructPeerIdFromPeerInfo(samplePeers[0])),
				).to.be.undefined;
			});
		});

		describe('when maxReconnectTries is 2', () => {
			beforeEach(async () => {
				const triedPeerConfig = {
					maxReconnectTries: 2,
					triedPeerBucketSize: 32,
					triedPeerListSize: 64,
				};

				triedPeersList = new TriedPeers(triedPeerConfig);
				triedPeersList.addPeer(samplePeers[0]);
			});

			it('should not remove the peer after the first call and remove it after second failed connection', async () => {
				const success1 = triedPeersList.failedConnectionAction(samplePeers[0]);
				expect(success1).to.be.false;
				expect(
					triedPeersList.getPeer(constructPeerIdFromPeerInfo(samplePeers[0])),
				).to.be.eql(samplePeers[0]);

				const success2 = triedPeersList.failedConnectionAction(samplePeers[0]);
				expect(success2).to.be.true;
				expect(
					triedPeersList.getPeer(constructPeerIdFromPeerInfo(samplePeers[0])),
				).to.be.undefined;
			});
		});
	});
});
