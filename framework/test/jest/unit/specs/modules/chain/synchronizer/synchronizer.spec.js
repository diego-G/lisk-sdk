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
 */

'use strict';

const {
	Synchronizer,
} = require('../../../../../../../src/modules/chain/synchronizer/synchronizer');

const maxPayloadLength = 10000;
const maxTransactionsPerBlock = 25;

const storageMock = {
	entities: {
		Block: {
			getOne: jest.fn(),
		},
	},
};

const syncParameters = {
	storage: storageMock,
	logger: {},
	exceptions: {},
	blockReward: {},
	maxTransactionsPerBlock,
	maxPayloadLength,
};

describe('synchronizer', () => {
	afterEach(async () => {
		jest.clearAllMocks();
	});

	describe('Synchronizer', () => {
		let sync;

		beforeEach(async () => {
			sync = new Synchronizer(syncParameters);
		});

		describe('constructor()', () => {
			it('should create instance of Synchronizer', async () => {
				expect(sync).toBeInstanceOf(Synchronizer);
			});

			it('should assign dependencies', async () => {
				expect(sync.storage).toBe(syncParameters.storage);
				expect(sync.logger).toBe(syncParameters.logger);
				expect(sync.blockReward).toBe(syncParameters.blockReward);
				expect(sync.exceptions).toBe(syncParameters.exceptions);
				expect(sync.constants).toEqual({
					maxTransactionsPerBlock,
					maxPayloadLength,
				});
				expect(sync.mechanisms).toEqual([]);
			});
		});

		describe('register()', () => {
			it('should throw error if sync mechanism not have "isValidFor" async interface ', async () => {
				const syncMechanism = { isValidFor: () => {} };

				expect(() => sync.register(syncMechanism)).toThrow(
					'Sync mechanism must have "isValidFor" async interface'
				);
			});

			it('should throw error if sync mechanism not have "run" async interface ', async () => {
				const syncMechanism = { isValidFor: async () => {}, run: () => {} };

				expect(() => sync.register(syncMechanism)).toThrow(
					'Sync mechanism must have "run" async interface'
				);
			});

			it('should throw error if sync mechanism not have "isActive" interface ', async () => {
				const syncMechanism = {
					isValidFor: async () => {},
					run: async () => {},
				};

				expect(() => sync.register(syncMechanism)).toThrow(
					'Sync mechanism must have "isActive" interface'
				);
			});

			it('should register sync mechanisms', async () => {
				const syncMechanism1 = {
					isValidFor: async () => {},
					run: async () => {},
					isActive: false,
				};
				const syncMechanism2 = {
					isValidFor: async () => {},
					run: async () => {},
					isActive: false,
				};

				sync.register(syncMechanism1);
				sync.register(syncMechanism2);

				expect(sync.mechanisms).toEqual([syncMechanism1, syncMechanism2]);
			});
		});
	});
});
