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
import { BaseList, PeerListConfig } from './base_list';
import { DEFAULT_EVICTION_THRESHOLD_TIME } from '../constants';
import { P2PEnhancedPeerInfo } from '../p2p_types';
import { evictPeerRandomlyFromBucket, expirePeerFromBucket } from '../utils';

export interface NewListConfig extends PeerListConfig {
	readonly evictionThresholdTime?: number;
}

export class NewList extends BaseList {
	private readonly _evictionThresholdTime: number;

	public constructor({
		evictionThresholdTime,
		peerBucketCount,
		peerBucketSize,
		secret,
		peerType,
	}: NewListConfig) {
		super({
			secret,
			peerBucketCount,
			peerBucketSize,
			peerType,
		});

		this._evictionThresholdTime = evictionThresholdTime
			? evictionThresholdTime
			: DEFAULT_EVICTION_THRESHOLD_TIME;
	}

	public get newPeerConfig(): NewListConfig {
		return {
			...this.peerListConfig,
			evictionThresholdTime: this._evictionThresholdTime,
		};
	}
	
	// Override make space method from base list
	public makeSpace(peerInfo: P2PEnhancedPeerInfo): P2PEnhancedPeerInfo | undefined {
		const { bucket } = this.calculateBucket(peerInfo.ipAddress, peerInfo.sourceAddress ? peerInfo.sourceAddress : undefined);

		if (bucket && bucket.size === this.peerListConfig.peerBucketSize) {
			// First eviction strategy: eviction by time of residence
			const evictedPeer = expirePeerFromBucket(
				bucket,
				this._evictionThresholdTime,
			);
			if (evictedPeer) {
				return evictedPeer;
			}

			// Second eviction strategy: Default eviction based on base class
			return evictPeerRandomlyFromBucket(bucket);
		}

		return undefined;
	}
}
