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
import { DEFAULT_EVICTION_THRESHOLD_TIME } from '../constants';

import {
	BaseList,
	CustomPeerInfo,
	evictPeerRandomlyFromBucket,
	PeerListConfig,
} from './base_list';

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
	public makeSpace(ipAddress: string): CustomPeerInfo | undefined {
		const bucket = this.getBucket(ipAddress);

		if (bucket && bucket.size === this.peerListConfig.peerBucketSize) {
			// First eviction strategy: eviction by time of residence
			for (const [peerId, peer] of bucket) {
				const timeDifference = Math.round(
					Math.abs(peer.dateAdded.getTime() - new Date().getTime()),
				);

				if (timeDifference >= this._evictionThresholdTime) {
					bucket.delete(peerId);

					return peer;
				}
			}

			// Second eviction strategy: Default eviction based on base class
			return evictPeerRandomlyFromBucket(bucket);
		}

		return undefined;
	}
}
