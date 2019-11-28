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
import { DEFAULT_MAX_RECONNECT_TRIES } from '../constants';
import { P2PEnhancedPeerInfo, P2PPeerInfo } from '../p2p_types';
import { BaseList, PeerListConfig } from './base_list';

export interface TriedListConfig extends PeerListConfig {
	readonly maxReconnectTries?: number;
}

export class TriedList extends BaseList {
	private readonly _maxReconnectTries: number;

	public constructor({
		peerBucketCount,
		maxReconnectTries,
		secret,
		peerBucketSize,
		peerType,
	}: TriedListConfig) {
		super({
			secret,
			peerBucketCount,
			peerBucketSize,
			peerType,
		});

		this._maxReconnectTries = maxReconnectTries
			? maxReconnectTries
			: DEFAULT_MAX_RECONNECT_TRIES;

		this.initBuckets(this.bucketIdToBucket);
	}

	// Override init peer info
	public initPeerInfo = (peerInfo: P2PPeerInfo): P2PEnhancedPeerInfo => ({
		...peerInfo,
		numOfConnectionFailures: 0,
		dateAdded: new Date(),
	});

	public get triedPeerConfig(): TriedListConfig {
		return {
			...this.peerListConfig,
			maxReconnectTries: this._maxReconnectTries,
		};
	}

	// Should return true if the peer is evicted due to failed connection
	public failedConnectionAction(incomingPeerInfo: P2PPeerInfo): boolean {
		const { bucket } = this.calculateBucket(incomingPeerInfo.ipAddress);
		const incomingPeerId = incomingPeerInfo.peerId;
		const foundPeer = bucket.get(incomingPeerId);
		if (!foundPeer) {
			return false;
		}
		const {
			numOfConnectionFailures,
		} = foundPeer;

		if (numOfConnectionFailures as number + 1 >= this._maxReconnectTries) {
			bucket.delete(incomingPeerId);

			return true;
		}
		const updatedTriedPeerInfo = {
			...foundPeer,
			numOfConnectionFailures: numOfConnectionFailures as number + 1,
		};

		bucket.set(incomingPeerId, updatedTriedPeerInfo);

		return false;
	}
}
