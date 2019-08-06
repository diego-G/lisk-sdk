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

describe.only('triedPeer', () => {
	describe('#constructor', () => {
		let triedPeersList: TriedPeers;
		const triedPeerConfig = {
			maxReconnectTries: 3,
			triedPeerBucketSize: 32,
			triedPeerListSize: 32,
		};

		beforeEach(async () => {
			triedPeersList = new TriedPeers(triedPeerConfig);
		});

		it('should set properties correctly and create a map of 32 size with 32 buckets each', async () => {
			expect(triedPeersList.triedPeerConfig).to.be.eql(triedPeerConfig);
			expect(triedPeersList.triedPeerMap.size).to.be.equal(32);

			let bucketSize = Array.of([...triedPeersList.triedPeerMap.values()])[0]
				.length;
			expect(bucketSize).to.be.equal(32);
		});
	});

	describe('#addPeer', () => {
		let triedPeersList: TriedPeers;
		const samplePeers = initializePeerInfoList();

		beforeEach(async () => {
			const triedPeerConfig = {
				maxReconnectTries: 3,
				triedPeerBucketSize: 32,
				triedPeerListSize: 32,
			};

			triedPeersList = new TriedPeers(triedPeerConfig);
			triedPeersList.addPeer(samplePeers[0]);
		});

		it('should add the incoming peer if it does not exist already', async () => {
			expect(triedPeersList.findPeer(samplePeers[0])).to.be.true;
		});

		// it('should not add the incoming peer if it exists', async () => {
		// 	expect(triedPeersList.addPeer(samplePeers[0])).to.be.undefined;
		// });
	});
});
