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
import { P2PDiscoveredPeerInfo, P2PPeerInfo } from '../p2p_types';
import { constructPeerIdFromPeerInfo, getBucket } from '../utils';

const NEW_PEER_LIST_SIZE = 64;
const NEW_PEER_BUCKET_SIZE = 32;
const MILLISECONDS_IN_ONE_DAY = 86400000; // Formula hours*minutes*seconds*milliseconds;
const ELIGIBLE_DAYS_FOREVICTION = 30;

interface NewPeerInfo {
	readonly peerInfo: P2PPeerInfo;
	readonly dateAdded: Date;
}

export class NewPeers {
	private readonly _newPeerMap: Map<number, Map<string, NewPeerInfo>>;

	public constructor() {
		// Initialize the Map with all the buckets
		this._newPeerMap = new Map();
		[...Array(NEW_PEER_LIST_SIZE).keys()]
			.map(x => x + 1)
			.forEach(bucketNumber => {
				this._newPeerMap.set(bucketNumber, new Map<string, NewPeerInfo>());
			});
	}

	public findPeer(peerInfo: P2PPeerInfo): boolean {
		// tslint:disable-next-line:no-let
		let ifExists = false;

		[...this._newPeerMap.values()].forEach(peersMap => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			if (peersMap.has(peerId)) {
				ifExists = true;

				return;
			}
		});

		return ifExists;
	}

	public updatePeer(peerInfo: P2PDiscoveredPeerInfo): void {
		[...this._newPeerMap.values()].forEach(peersMap => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			if (peersMap.has(peerId)) {
				return;
			}
		});
	}

	public removePeer(peerInfo: P2PDiscoveredPeerInfo): void {
		[...this._newPeerMap.values()].forEach(peersMap => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			peersMap.delete(peerId);
		});
	}

	public getPeer(peerInfo: P2PPeerInfo): P2PPeerInfo | undefined {
		// tslint:disable-next-line:no-let
		let peer: NewPeerInfo | undefined;

		[...this._newPeerMap.values()].forEach(peersMap => {
			const peerId = constructPeerIdFromPeerInfo(peerInfo);
			peer = peersMap.get(peerId);

			return;
		});

		return peer ? peer.peerInfo : undefined;
	}

	public addPeer(peerInfo: P2PPeerInfo): boolean {
		// tslint:disable-next-line:no-let
		let success = false;

		if (!this.findPeer(peerInfo)) {
			const newTriedPeerInfo = {
				peerInfo,
				numOfConnectionFailures: 0,
				dateAdded: new Date(),
			};

			const bucketNumber = getBucket(
				peerInfo.ipAddress,
				Math.random(),
				NEW_PEER_LIST_SIZE,
			);
			if (bucketNumber) {
				const bucketList = this._newPeerMap.get(bucketNumber);
				if (bucketList) {
					if (bucketList.size < NEW_PEER_BUCKET_SIZE) {
						bucketList.set(
							constructPeerIdFromPeerInfo(peerInfo),
							newTriedPeerInfo,
						);
						this._newPeerMap.set(bucketNumber, bucketList);
						success = true;
					} else {
						this._evictPeer(bucketNumber);
						bucketList.set(
							constructPeerIdFromPeerInfo(peerInfo),
							newTriedPeerInfo,
						);
						this._newPeerMap.set(bucketNumber, bucketList);
						success = true;
					}
				}
			}
		}

		return success;
	}

	public failedConnectionAction(
		incomingPeerInfo: P2PDiscoveredPeerInfo,
	): boolean {
		// tslint:disable-next-line:no-let
		let evictPeer = false;

		[...this._newPeerMap.values()].forEach((peersMap, index) => {
			const peerId = constructPeerIdFromPeerInfo(incomingPeerInfo);
			peersMap.delete(peerId);
			this._newPeerMap.set(index, peersMap);
			evictPeer = true;
		});

		return evictPeer;
	}

	private _evictPeer(bucketId: number): NewPeerInfo | undefined {
		const peerList = this._newPeerMap.get(bucketId);

		if (!peerList) {
			throw new Error(`No Peer list for bucket Id: ${bucketId}`);
		}

		// First eviction strategy
		const evictedPeerBasedOnTime = this._evictionBasedOnTimeInBucket(
			bucketId,
			peerList,
		);

		if (evictedPeerBasedOnTime) {
			return evictedPeerBasedOnTime;
		}

		// Second eviction strategy
		return this._evictionRandom(bucketId, peerList);
	}

	private _evictionBasedOnTimeInBucket(
		bucketId: number,
		peerList: Map<string, NewPeerInfo>,
	): NewPeerInfo | undefined {
		// tslint:disable-next-line:no-let
		let evictedPeer: NewPeerInfo | undefined;

		[...this._newPeerMap.values()].forEach(peersMap => {
			[...peersMap.keys()].forEach(peerId => {
				const peer = peersMap.get(peerId);
				if (peer) {
					const diffDays = Math.round(
						Math.abs(
							(peer.dateAdded.getTime() - new Date().getTime()) /
								MILLISECONDS_IN_ONE_DAY,
						),
					);
					if (diffDays >= ELIGIBLE_DAYS_FOREVICTION) {
						peerList.delete(peerId);
						this._newPeerMap.set(bucketId, peerList);
						evictedPeer = peer;
					}
				}
			});
		});

		return evictedPeer;
	}

	private _evictionRandom(
		bucketId: number,
		peerList: Map<string, NewPeerInfo>,
	): NewPeerInfo | undefined {
		// Second eviction strategy
		const randomPeerIndex = Math.floor(Math.random() * NEW_PEER_BUCKET_SIZE);
		const randomPeerId = Array.from(peerList.keys())[randomPeerIndex];
		peerList.delete(randomPeerId);
		this._newPeerMap.set(bucketId, peerList);
		const evictedPeer = peerList.get(randomPeerId);

		return evictedPeer;
	}
}
