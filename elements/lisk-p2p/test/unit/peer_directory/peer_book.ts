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
import { initPeerInfoList } from '../../utils/peers';
import { PeerBook, PeerBookConfig } from '../../../src/peer_directory';
import { DEFAULT_RANDOM_SECRET } from '../../../src/constants';
import { P2PDiscoveredPeerInfo } from '../../../src/p2p_types';

describe('peerBook', () => {
	const peerBookConfig: PeerBookConfig = {
		secret: DEFAULT_RANDOM_SECRET,
	};
	let peerBook: PeerBook;
	let samplePeers: ReadonlyArray<P2PDiscoveredPeerInfo>;

	describe('#constructor', () => {
		beforeEach(() => {
			peerBook = new PeerBook(peerBookConfig);
		});

		it('should intialize the blank peer lists and set the secret', () => {
			expect(peerBook).to.be.an('object');
			expect(peerBook.newPeers).length(0);
			expect(peerBook.triedPeers).length(0);
		});
	});

	describe('#newPeers', () => {
		it('should get new peers');
	});

	describe('#triedPeers', () => {
		it('should get tried peers');
	});

	describe('#allPeers', () => {
		it('should get all peers');
	});

	describe('#getPeer', () => {
		it('should get a peer by info');
	});

	describe('#addPeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerBook = new PeerBook(peerBookConfig);
			peerBook.addPeer(samplePeers[0]);
		});

		it('should add peer to the new peer list', () => {
			expect(peerBook.newPeers).length(1);
			expect(peerBook.getPeer(samplePeers[0])).to.be.eql(samplePeers[0]);
		});
	});

	describe('#updatePeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerBook = new PeerBook(peerBookConfig);
			peerBook.addPeer(samplePeers[0]);
		});

		it('should add peer to the new peer list', () => {
			expect(peerBook.newPeers).length(1);
			expect(peerBook.getPeer(samplePeers[0])).to.be.eql(samplePeers[0]);
		});
	});

	describe('#removePeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerBook = new PeerBook(peerBookConfig);
			peerBook.addPeer(samplePeers[0]);
			peerBook.removePeer(samplePeers[0]);
		});

		it('should add peer to the new peer list', () => {
			expect(peerBook.triedPeers).length(0);
			expect(peerBook.newPeers).length(0);
			expect(peerBook.getPeer(samplePeers[0])).to.be.undefined;
		});
	});

	describe('#upgradePeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerBook = new PeerBook(peerBookConfig);
			peerBook.addPeer(samplePeers[0]);
			peerBook.upgradePeer(samplePeers[0]);
		});

		it('should add peer to the tried peer list', () => {
			expect(peerBook.triedPeers).length(1);
			expect(peerBook.getPeer(samplePeers[0])).to.be.eql(samplePeers[0]);
		});
	});

	describe('#downgradePeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerBook = new PeerBook(peerBookConfig);
			peerBook.addPeer(samplePeers[0]);
		});

		it('should remove a peer when downgraded without any upgrade after addition to the peer list', () => {
			// The added peer is in newPeers
			expect(peerBook.newPeers).length(1);
			// Downgrade the peer over disconnection or any other event
			peerBook.downgradePeer(samplePeers[0]);
			// Peer should be deleted completely since it was only residing inside newPeers
			expect(peerBook.allPeers).length(0);
		});

		it('should add peer to the new peer list when downgraded 3 times after an upgrade', () => {
			peerBook.upgradePeer(samplePeers[0]);
			// Should move to triedPeers
			expect(peerBook.triedPeers).length(1);
			peerBook.downgradePeer(samplePeers[0]); // Downgrade the peer over disconnection or any other event
			peerBook.downgradePeer(samplePeers[0]);
			peerBook.downgradePeer(samplePeers[0]);
			expect(peerBook.triedPeers).length(0);
			// Should move to newPeers
			expect(peerBook.newPeers).length(1);
			expect(peerBook.getPeer(samplePeers[0])).to.be.eql(samplePeers[0]);
		});

		it('should remove a peer from all peer lists when downgraded 4 times after one upgrade before', () => {
			peerBook.upgradePeer(samplePeers[0]);
			// Should move to triedPeers
			expect(peerBook.triedPeers).length(1);
			peerBook.downgradePeer(samplePeers[0]); // Downgrade the peer over disconnection or any other event
			peerBook.downgradePeer(samplePeers[0]);
			peerBook.downgradePeer(samplePeers[0]);
			expect(peerBook.triedPeers).length(0);
			// Should move to newPeers
			expect(peerBook.newPeers).length(1);
			peerBook.downgradePeer(samplePeers[0]);
			expect(peerBook.getPeer(samplePeers[0])).to.be.undefined;
		});
	});
});
