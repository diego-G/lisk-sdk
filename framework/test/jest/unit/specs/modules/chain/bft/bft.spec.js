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

const { when } = require('jest-when');
const {
	Block: blockFixture,
} = require('../../../../../../mocha/fixtures/blocks');
const {
	FinalityManager,
} = require('../../../../../../../src/modules/chain/bft/finality_manager');
const { Slots } = require('../../../../../../../src/modules/chain/dpos');

const {
	BFT,
	extractBFTBlockHeaderFromBlock,
	FORK_STATUS_DISCARD,
	FORK_STATUS_VALID_BLOCK,
	FORK_STATUS_DIFFERENT_CHAIN,
	FORK_STATUS_TIE_BREAK,
	FORK_STATUS_IDENTICAL_BLOCK,
	FORK_STATUS_DOUBLE_FORGING,
} = require('../../../../../../../src/modules/chain/bft');

const { constants } = require('../../../../../utils');

const generateBlocks = ({ startHeight, numberOfBlocks }) =>
	new Array(numberOfBlocks)
		.fill(0)
		.map((_v, index) =>
			blockFixture({ height: startHeight + index, version: 2 }),
		);

describe('bft', () => {
	beforeEach(async () => {
		jest.resetAllMocks();
		jest.clearAllMocks();
	});

	describe('extractBFTBlockHeaderFromBlock', () => {
		it('should extract particular headers for bft', async () => {
			// Arrange,
			const block = blockFixture();
			const delegateMinHeightActive = 304;
			const {
				id: blockId,
				height,
				maxHeightPreviouslyForged,
				maxHeightPrevoted,
				generatorPublicKey: delegatePublicKey,
			} = block;
			block.delegateMinHeightActive = delegateMinHeightActive;

			const blockHeader = {
				blockId,
				height,
				maxHeightPreviouslyForged,
				maxHeightPrevoted,
				delegatePublicKey,
				delegateMinHeightActive,
			};

			expect(extractBFTBlockHeaderFromBlock(block)).toEqual(blockHeader);
		});
	});

	describe('BFT', () => {
		let storageMock;
		let loggerMock;
		let activeDelegates;
		let startingHeight;
		let bftParams;
		beforeEach(() => {
			storageMock = {
				entities: {
					Block: {
						get: jest.fn().mockResolvedValue([]),
					},
					ChainMeta: {
						getKey: jest.fn(),
						setKey: jest.fn(),
					},
					Account: {
						get: jest.fn().mockResolvedValue([]),
						getOne: jest.fn().mockResolvedValue({}),
					},
				},
			};

			const slots = new Slots({
				epochTime: constants.EPOCH_TIME,
				interval: constants.BLOCK_TIME,
				blocksPerRound: constants.ACTIVE_DELEGATES,
			});

			loggerMock = {};
			activeDelegates = 101;
			startingHeight = 0;
			bftParams = {
				storage: storageMock,
				logger: loggerMock,
				slots,
				activeDelegates,
				startingHeight,
			};
		});

		describe('#constructor', () => {
			it('should create instance of BFT', async () => {
				expect(new BFT(bftParams)).toBeInstanceOf(BFT);
			});

			it('should assign all parameters correctly', async () => {
				const bft = new BFT(bftParams);

				expect(bft.finalityManager).toBeNull();
				expect(bft.storage).toBe(storageMock);
				expect(bft.logger).toBe(loggerMock);
				expect(bft.constants).toEqual({ activeDelegates, startingHeight });
				expect(bft.blockEntity).toBe(storageMock.entities.Block);
				expect(bft.chainMetaEntity).toBe(storageMock.entities.ChainMeta);
			});
		});

		describe('#init', () => {
			let bft;

			beforeEach(async () => {
				bft = new BFT(bftParams);

				jest
					.spyOn(bft, '_initFinalityManager')
					.mockImplementation(() => ({ on: jest.fn() }));

				jest
					.spyOn(bft, '_getLastBlockHeight')
					.mockImplementation(() => jest.fn());

				jest
					.spyOn(bft, '_loadBlocksFromStorage')
					.mockImplementation(() => jest.fn());
			});

			it('should invoke _initFinalityManager()', async () => {
				await bft.init();

				expect(bft._initFinalityManager).toHaveBeenCalledTimes(1);
			});

			it('should invoke _getLastBlockHeight()', async () => {
				await bft.init();

				expect(bft._getLastBlockHeight).toHaveBeenCalledTimes(1);
			});

			it('should invoke _loadBlocksFromStorage() for finalizedHeight if its highest', async () => {
				bft.constants.startingHeight = 0;
				const finalizedHeight = 500;
				const lastBlockHeight = 600;
				const minActiveHeightsOfDelegates = { dummy: 'object' };

				bft._initFinalityManager.mockReturnValue({
					finalizedHeight,
					on: jest.fn(),
				});
				bft._getLastBlockHeight.mockReturnValue(lastBlockHeight);

				await bft.init(minActiveHeightsOfDelegates);

				expect(bft._loadBlocksFromStorage).toHaveBeenCalledTimes(1);
				expect(bft._loadBlocksFromStorage).toHaveBeenCalledWith({
					fromHeight: finalizedHeight,
					tillHeight: lastBlockHeight,
					minActiveHeightsOfDelegates,
				});
			});

			it('should invoke loadBlocksFromStorage() for lastBlockHeight - TWO_ROUNDS if its highest', async () => {
				bft.constants.startingHeight = 0;
				const finalizedHeight = 200;
				const lastBlockHeight = 600;
				const minActiveHeightsOfDelegates = { dummy: 'object' };

				bft._initFinalityManager.mockReturnValue({
					finalizedHeight,
					on: jest.fn(),
				});
				bft._getLastBlockHeight.mockReturnValue(lastBlockHeight);

				await bft.init(minActiveHeightsOfDelegates);

				expect(bft._loadBlocksFromStorage).toHaveBeenCalledTimes(1);
				expect(bft._loadBlocksFromStorage).toHaveBeenCalledWith({
					fromHeight: lastBlockHeight - activeDelegates * 2,
					tillHeight: lastBlockHeight,
					minActiveHeightsOfDelegates,
				});
			});

			it('should invoke loadBlocksFromStorage() for staringHeight if its highest', async () => {
				bft.constants.startingHeight = 550;
				const finalizedHeight = 200;
				const lastBlockHeight = 600;
				const minActiveHeightsOfDelegates = { dummy: 'object' };

				bft._initFinalityManager.mockReturnValue({
					finalizedHeight,
					on: jest.fn(),
				});
				bft._getLastBlockHeight.mockReturnValue(lastBlockHeight);

				await bft.init(minActiveHeightsOfDelegates);

				expect(bft._loadBlocksFromStorage).toHaveBeenCalledTimes(1);
				expect(bft._loadBlocksFromStorage).toHaveBeenCalledWith({
					fromHeight: bft.constants.startingHeight,
					tillHeight: lastBlockHeight,
					minActiveHeightsOfDelegates,
				});
			});
		});

		describe('#computeBFTHeaderProperties', () => {
			const delegatePublicKey =
				'9986cedd4b5a28e4c81d9b4bff0461dddaa25099df00b8632fe99e88df28ce73';

			let bft;

			beforeEach(async () => {
				bft = new BFT(bftParams);
				storageMock.entities.Block.get.mockReturnValue([]);
				await bft.init();
				storageMock.entities.Block.get.mockClear();
			});

			describe('when a delegate is first time forging', () => {
				beforeEach(async () => {
					when(storageMock.entities.ChainMeta.getKey)
						.calledWith('BFT.maxHeightPreviouslyForged')
						.mockResolvedValue(undefined);
				});

				it('should return maxHeightPreviouslyForged as 0', async () => {
					const props = await bft.computeBFTHeaderProperties(delegatePublicKey);
					expect(props.maxHeightPreviouslyForged).toBe(0);
				});

				it('should return maxHeightPrevoted up to last block', async () => {
					const props = await bft.computeBFTHeaderProperties(delegatePublicKey);
					expect(props.maxHeightPrevoted).toBe(0);
				});
			});

			describe('when a delegate forged before', () => {
				const lastForgedHeight = 123;
				beforeEach(async () => {
					const previouslyForgedMap = {
						[delegatePublicKey]: lastForgedHeight,
						dummyDelegate: 100,
					};
					when(storageMock.entities.ChainMeta.getKey)
						.calledWith('BFT.maxHeightPreviouslyForged')
						.mockResolvedValue(JSON.stringify(previouslyForgedMap));
				});

				it('should return maxHeightPreviouslyForged as height previouslyForged', async () => {
					const props = await bft.computeBFTHeaderProperties(delegatePublicKey);
					expect(props.maxHeightPreviouslyForged).toBe(lastForgedHeight);
				});

				it('should return maxHeightPrevoted up to last block', async () => {
					const props = await bft.computeBFTHeaderProperties(delegatePublicKey);
					expect(props.maxHeightPrevoted).toBe(0);
				});
			});
		});

		describe('#saveMaxHeightPreviouslyForged', () => {
			const delegatePublicKey =
				'9986cedd4b5a28e4c81d9b4bff0461dddaa25099df00b8632fe99e88df28ce73';
			const forgingHeight = 303;

			let bft;

			beforeEach(async () => {
				bft = new BFT(bftParams);
				storageMock.entities.Block.get.mockReturnValue([]);
				await bft.init();
				storageMock.entities.Block.get.mockClear();
			});

			describe('when a delegate is first time forging', () => {
				const previouslyForgedMap = {
					dummyDelegate: 100,
				};

				beforeEach(async () => {
					when(storageMock.entities.ChainMeta.getKey)
						.calledWith('BFT.maxHeightPreviouslyForged')
						.mockResolvedValue(JSON.stringify(previouslyForgedMap));
				});

				it('should save the forging height and not change other properties', async () => {
					await bft.saveMaxHeightPreviouslyForged(
						delegatePublicKey,
						forgingHeight,
					);
					expect(storageMock.entities.ChainMeta.setKey).toHaveBeenCalledWith(
						'BFT.maxHeightPreviouslyForged',
						JSON.stringify({
							...previouslyForgedMap,
							[delegatePublicKey]: forgingHeight,
						}),
					);
				});
			});

			describe('when a delegate forged before on lower height', () => {
				const previouslyForgedMap = {
					dummyDelegate: 100,
					[delegatePublicKey]: 11,
				};

				beforeEach(async () => {
					when(storageMock.entities.ChainMeta.getKey)
						.calledWith('BFT.maxHeightPreviouslyForged')
						.mockResolvedValue(JSON.stringify(previouslyForgedMap));
				});

				it('should save the forging height and not change other properties', async () => {
					await bft.saveMaxHeightPreviouslyForged(
						delegatePublicKey,
						forgingHeight,
					);
					expect(storageMock.entities.ChainMeta.setKey).toHaveBeenCalledWith(
						'BFT.maxHeightPreviouslyForged',
						JSON.stringify({
							...previouslyForgedMap,
							[delegatePublicKey]: forgingHeight,
						}),
					);
				});
			});

			describe('when a delegate forged before on higher height', () => {
				const higherHeightOriginallyForged = 500;
				const previouslyForgedMap = {
					dummyDelegate: 100,
					[delegatePublicKey]: higherHeightOriginallyForged,
				};

				beforeEach(async () => {
					when(storageMock.entities.ChainMeta.getKey)
						.calledWith('BFT.maxHeightPreviouslyForged')
						.mockResolvedValue(JSON.stringify(previouslyForgedMap));
				});

				it('should save the forging height and not change other properties', async () => {
					await bft.saveMaxHeightPreviouslyForged(
						delegatePublicKey,
						forgingHeight,
					);
					expect(storageMock.entities.ChainMeta.setKey).not.toHaveBeenCalled();
				});
			});

			describe('when a delegate forged before on the same height', () => {
				const previouslyForgedMap = {
					dummyDelegate: 100,
					[delegatePublicKey]: forgingHeight,
				};

				beforeEach(async () => {
					when(storageMock.entities.ChainMeta.getKey)
						.calledWith('BFT.maxHeightPreviouslyForged')
						.mockResolvedValue(JSON.stringify(previouslyForgedMap));
				});

				it('should save the forging height and not change other properties', async () => {
					await bft.saveMaxHeightPreviouslyForged(
						delegatePublicKey,
						forgingHeight,
					);
					expect(storageMock.entities.ChainMeta.setKey).not.toHaveBeenCalled();
				});
			});
		});

		describe('#addNewBlock', () => {
			const block1 = blockFixture({ height: 1, version: 2 });
			const lastFinalizedHeight = 5;

			let bft;
			let txStub;

			beforeEach(async () => {
				storageMock.entities.Block.get.mockReturnValue([]);
				bft = new BFT(bftParams);
				storageMock.entities.ChainMeta.getKey.mockReturnValue(
					lastFinalizedHeight,
				);
				txStub = jest.fn();
				await bft.init();
				storageMock.entities.Block.get.mockClear();
			});

			describe('when valid block which does not change the finality is added', () => {
				it('should update the latest finalized height to storage', async () => {
					await bft.addNewBlock(block1, txStub);
					expect(storageMock.entities.ChainMeta.setKey).toHaveBeenCalledWith(
						'BFT.finalizedHeight',
						lastFinalizedHeight,
						txStub,
					);
				});
			});
		});

		describe('#deleteBlocks', () => {
			let bft;

			beforeEach(async () => {
				bft = new BFT(bftParams);
				storageMock.entities.Block.get.mockReturnValue([]);
				await bft.init();
				storageMock.entities.Block.get.mockClear();
			});

			it('should reject with error if no blocks are provided', async () => {
				// Act & Assert
				await expect(bft.deleteBlocks()).rejects.toThrow(
					'Must provide blocks which are deleted',
				);
			});

			it('should reject with error if blocks are not provided as array', async () => {
				// Act & Assert
				await expect(bft.deleteBlocks({})).rejects.toThrow(
					'Must provide list of blocks',
				);
			});

			it('should reject with error if blocks deleted contains block with lower than finalized height', async () => {
				// Arrange
				bft = new BFT(bftParams);
				storageMock.entities.ChainMeta.getKey.mockReturnValue(5);
				await bft.init();
				const blocks = [
					blockFixture({ height: 4, version: 2 }),
					blockFixture({ height: 5, version: 2 }),
					blockFixture({ height: 6, version: 2 }),
				];

				// Act & Assert
				await expect(bft.deleteBlocks(blocks)).rejects.toThrow(
					'Can not delete block below or same as finalized height',
				);
			});

			it('should reject with error if blocks deleted contains block with same as finalized height', async () => {
				// Arrange
				bft = new BFT(bftParams);
				storageMock.entities.ChainMeta.getKey.mockReturnValue(5);
				await bft.init();
				const blocks = [
					blockFixture({ height: 5, version: 2 }),
					blockFixture({ height: 6, version: 2 }),
				];

				// Act & Assert
				await expect(bft.deleteBlocks(blocks)).rejects.toThrow(
					'Can not delete block below or same as finalized height',
				);
			});

			it('should delete the block headers form list for all given blocks', async () => {
				// Arrange
				const block1 = blockFixture({ height: 1, version: 2 });
				const block2 = blockFixture({ height: 2, version: 2 });
				const block3 = blockFixture({ height: 3, version: 2 });
				const block4 = blockFixture({ height: 4, version: 2 });
				await bft.addNewBlock(block1);
				await bft.addNewBlock(block2);
				await bft.addNewBlock(block3);
				await bft.addNewBlock(block4);

				// Act
				await bft.deleteBlocks([block3, block4]);

				// Assert
				expect(bft.finalityManager.minHeight).toEqual(1);
				expect(bft.finalityManager.maxHeight).toEqual(2);
				expect(bft.finalityManager.headers.items).toEqual([
					extractBFTBlockHeaderFromBlock(block1),
					extractBFTBlockHeaderFromBlock(block2),
				]);
			});

			it('should load more blocks from storage if remaining in headers list is less than 2 rounds', async () => {
				// Arrange
				// Generate 500 blocks
				const numberOfBlocks = 500;
				const numberOfBlocksToDelete = 50;
				const blocks = generateBlocks({
					startHeight: 1,
					numberOfBlocks,
				});
				// Last 100 blocks from height 401 to 500
				const blocksInBft = blocks.slice(400);

				// Last 50 blocks from height 451 to 500
				const blocksToDelete = blocks.slice(-numberOfBlocksToDelete);

				// Will fetch 202 - (450 - 401) = 153 more blocks
				const blocksFetchedFromStorage = blocks.slice(400 - 153, 400).reverse();

				// eslint-disable-next-line no-restricted-syntax
				for (const block of blocksInBft) {
					// eslint-disable-next-line no-await-in-loop
					await bft.addNewBlock(block);
				}

				// When asked by BFT, return last [blocksToDelete] blocks ()
				storageMock.entities.Block.get.mockReturnValue(
					blocksFetchedFromStorage,
				);

				// minActiveHeightsOfDelegates is provided to deleteBlocks function
				// in block_processor_v2 from DPoS module.
				const minActiveHeightsOfDelegates = blocks.reduce((acc, block) => {
					acc[block.generatorPublicKey] = {
						publicKey: block.generateBlocks,
						// the value is not important in this test.
						activeHeights: [1],
					};

					return acc;
				}, {});

				// Act - Delete top 50 blocks (500-450 height)
				await bft.deleteBlocks(blocksToDelete, minActiveHeightsOfDelegates);

				// Assert
				expect(bft.finalityManager.maxHeight).toEqual(450);
				expect(bft.finalityManager.minHeight).toEqual(
					450 - activeDelegates * 2,
				);
				expect(storageMock.entities.Block.get).toHaveBeenCalledTimes(1);
				expect(storageMock.entities.Block.get).toHaveBeenLastCalledWith(
					{ height_lte: 400, height_gte: 450 - activeDelegates * 2 },
					{ limit: null, sort: 'height:desc' },
				);
			});

			it('should not load more blocks from storage if remaining in headers list is more than 2 rounds', async () => {
				// Arrange
				// Generate 500 blocks
				const numberOfBlocks = 500;
				const numberOfBlocksToDelete = 50;
				const blocks = generateBlocks({
					startHeight: 1,
					numberOfBlocks,
				});
				// Last 300 blocks from height 201 to 500
				const blocksInBft = blocks.slice(200);

				// Last 50 blocks from height 451 to 500
				const blocksToDelete = blocks.slice(-numberOfBlocksToDelete);

				// minActiveHeightsOfDelegates is provided to deleteBlocks function
				// in block_processor_v2 from DPoS module.
				const minActiveHeightsOfDelegates = blocks.reduce((acc, block) => {
					acc[block.generatorPublicKey] = {
						publicKey: block.generateBlocks,
						// the value is not important in this test.
						activeHeights: [1],
					};

					return acc;
				}, {});

				// Load last 300 blocks to bft (201 to 500)
				// eslint-disable-next-line no-restricted-syntax
				for (const block of blocksInBft) {
					// eslint-disable-next-line no-await-in-loop
					await bft.addNewBlock(block);
				}

				// Act
				await bft.deleteBlocks(blocksToDelete, minActiveHeightsOfDelegates);

				// Assert
				expect(bft.finalityManager.maxHeight).toEqual(450);
				expect(bft.finalityManager.minHeight).toEqual(201);
				expect(storageMock.entities.Block.get).toHaveBeenCalledTimes(0);
			});

			it('should not load more blocks from storage if remaining in headers list is exactly 2 rounds', async () => {
				// Arrange
				// Generate 500 blocks
				const numberOfBlocks = 500;
				const blocks = generateBlocks({
					startHeight: 1,
					numberOfBlocks,
				});
				// Last 300 blocks from height 201 to 500
				const blocksInBft = blocks.slice(200);

				// Delete blocks keeping exactly two rounds in the list from (201 to 298)
				const blocksToDelete = blocks.slice(
					-1 * (300 - activeDelegates * 2 - 1),
				);

				// minActiveHeightsOfDelegates is provided to deleteBlocks function
				// in block_processor_v2 from DPoS module.
				const minActiveHeightsOfDelegates = blocks.reduce((acc, block) => {
					acc[block.generatorPublicKey] = {
						publicKey: block.generateBlocks,
						// the value is not important in this test.
						activeHeights: [1],
					};

					return acc;
				}, {});

				// Load last 300 blocks to bft (201 to 500)
				// eslint-disable-next-line no-restricted-syntax
				for (const block of blocksInBft) {
					// eslint-disable-next-line no-await-in-loop
					await bft.addNewBlock(block);
				}

				// Act
				await bft.deleteBlocks(blocksToDelete, minActiveHeightsOfDelegates);

				// Assert
				expect(bft.finalityManager.maxHeight).toEqual(403);
				expect(bft.finalityManager.minHeight).toEqual(
					403 - activeDelegates * 2,
				);
				expect(storageMock.entities.Block.get).toHaveBeenCalledTimes(0);
			});
		});

		describe('#isBFTProtocolCompliant', () => {
			let bft;
			let blocks;

			beforeEach(async () => {
				// Arrange
				bft = new BFT(bftParams);
				storageMock.entities.Block.get.mockReturnValue([]);
				await bft.init();

				// Setup BFT module with blocks
				const numberOfBlocks = 101;
				blocks = generateBlocks({
					startHeight: 1,
					numberOfBlocks,
				});

				for (const block of blocks) {
					await bft.addNewBlock(block);
				}
			});

			it('should THROW if block is not provided', async () => {
				// Act & Assert
				expect(() => bft.isBFTProtocolCompliant()).toThrow(
					'No block was provided to be verified',
				);
			});

			it('should return TRUE when B.maxHeightPreviouslyForged is equal to 0', async () => {
				// Arrange
				const block = {
					height: 102,
					generatorPublicKey: 'zxc',
					maxHeightPreviouslyForged: 0,
				};

				// Act & Assert
				expect(bft.isBFTProtocolCompliant(block)).toBe(true);
			});

			it('should return FALSE when B.maxHeightPreviouslyForged is equal to B.height', async () => {
				// Arrange
				const block = {
					height: 203,
					maxHeightPreviouslyForged: 203,
				};

				// Act & Assert
				expect(bft.isBFTProtocolCompliant(block)).toBe(false);
			});

			it('should return FALSE when B.maxHeightPreviouslyForged is greater than B.height', async () => {
				// Arrange
				const block = {
					height: 203,
					maxHeightPreviouslyForged: 204,
				};

				// Act & Assert
				expect(bft.isBFTProtocolCompliant(block)).toBe(false);
			});

			describe('when B.height - B.maxHeightPreviouslyForged is less than 303', () => {
				it('should return FALSE if the block at height B.maxHeightPreviouslyForged in the current chain was NOT forged by B.generatorPublicKey', async () => {
					// Arrange
					const block = {
						height: 403,
						generatorPublicKey: 'zxc',
						maxHeightPreviouslyForged: 101,
					};

					// Act & Assert
					expect(bft.isBFTProtocolCompliant(block)).toBe(false);
				});

				it('should return TRUE if the block at height B.maxHeightPreviouslyForged in the current chain was forged by B.generatorPublicKey', async () => {
					// Arrange
					const block = {
						height: 403,
						generatorPublicKey: blocks[100].generatorPublicKey,
						maxHeightPreviouslyForged: 101,
					};

					// Act & Assert
					expect(bft.isBFTProtocolCompliant(block)).toBe(true);
				});
			});

			describe('when B.height - B.maxHeightPreviouslyForged is equal to 303', () => {
				it('should return FALSE if the block at height B.maxHeightPreviouslyForged in the current chain was NOT forged by B.generatorPublicKey', async () => {
					// Arrange
					const block = {
						height: 404,
						generatorPublicKey: 'zxc',
						maxHeightPreviouslyForged: 101,
					};

					// Act & Assert
					expect(bft.isBFTProtocolCompliant(block)).toBe(false);
				});

				it('should return TRUE if the block at height B.maxHeightPreviouslyForged in the current chain was forged by B.generatorPublicKey', async () => {
					// Arrange
					const block = {
						height: 404,
						generatorPublicKey: blocks[100].generatorPublicKey,
						maxHeightPreviouslyForged: 101,
					};

					// Act & Assert
					expect(bft.isBFTProtocolCompliant(block)).toBe(true);
				});
			});

			describe('when B.height - B.maxHeightPreviouslyForged is greater than 303', () => {
				it('should return TRUE if the block at height B.maxHeightPreviouslyForged in the current chain was NOT forged by B.generatorPublicKey', async () => {
					// Arrange
					const block = {
						height: 405,
						generatorPublicKey: 'zxc',
						maxHeightPreviouslyForged: 101,
					};

					// Act & Assert
					expect(bft.isBFTProtocolCompliant(block)).toBe(true);
				});

				it('should return TRUE if the block at height B.maxHeightPreviouslyForged in the current chain was forged by B.generatorPublicKey', async () => {
					// Arrange
					const block = {
						height: 405,
						generatorPublicKey: blocks[100].generatorPublicKey,
						maxHeightPreviouslyForged: 101,
					};

					// Act & Assert
					expect(bft.isBFTProtocolCompliant(block)).toBe(true);
				});
			});
		});

		describe('#forkChoice', () => {
			const defaults = {};
			let bftInstance;

			beforeEach(async () => {
				bftInstance = new BFT(bftParams);
				defaults.lastBlock = {
					id: '1',
					height: 1,
					version: 2,
					generatorPublicKey: 'abcdef',
					maxHeightPrevoted: 1,
					timestamp: bftInstance.slots.getEpochTime(Date.now()),
				};

				defaults.newBlock = {
					id: '2',
					height: 2,
					version: 2,
					generatorPublicKey: 'ghijkl',
					maxHeightPrevoted: 1,
					timestamp: bftInstance.slots.getEpochTime(Date.now()),
				};
			});

			it('should return FORK_STATUS_IDENTICAL_BLOCK if isIdenticalBlock evaluates to true', () => {
				const aNewBlock = {
					...defaults.newBlock,
					id: defaults.lastBlock.id,
				};

				expect(bftInstance.forkChoice(aNewBlock, defaults.lastBlock)).toEqual(
					FORK_STATUS_IDENTICAL_BLOCK,
				);
			});

			it('should return FORK_STATUS_VALID_BLOCK if isValidBlock evaluates to true', () => {
				const aNewBlock = {
					...defaults.newBlock,
					height: defaults.lastBlock.height + 1,
					previousBlockId: defaults.lastBlock.id,
				};

				expect(bftInstance.forkChoice(aNewBlock, defaults.lastBlock)).toEqual(
					FORK_STATUS_VALID_BLOCK,
				);
			});

			it('should return FORK_STATUS_DOUBLE_FORGING if isDoubleForging evaluates to true', () => {
				const aNewBlock = {
					...defaults.newBlock,
					height: defaults.lastBlock.height,
					maxHeightPrevoted: defaults.lastBlock.maxHeightPrevoted,
					previousBlockId: defaults.lastBlock.previousBlockId,
					generatorPublicKey: defaults.lastBlock.generatorPublicKey,
				};

				expect(bftInstance.forkChoice(aNewBlock, defaults.lastBlock)).toEqual(
					FORK_STATUS_DOUBLE_FORGING,
				);
			});

			it('should return FORK_STATUS_TIE_BREAK if isTieBreak evaluates to true', () => {
				const aNewBlock = {
					...defaults.newBlock,
					height: defaults.lastBlock.height,
					maxHeightPrevoted: defaults.lastBlock.maxHeightPrevoted,
					previousBlockId: defaults.lastBlock.previousBlockId,
					timestamp: defaults.lastBlock.timestamp + 1000,
				};

				bftInstance.slots.getEpochTime = jest.fn(
					() => defaults.lastBlock.timestamp + 1000,
				); // It will get assigned to newBlock.receivedAt

				const lastBlock = {
					...defaults.lastBlock,
					receivedAt: defaults.lastBlock.timestamp + 1000, // Received late
				};

				expect(bftInstance.forkChoice(aNewBlock, lastBlock)).toEqual(
					FORK_STATUS_TIE_BREAK,
				);
			});

			it('should return FORK_STATUS_DIFFERENT_CHAIN if isDifferentChain evaluates to true', () => {
				const aNewBlock = {
					...defaults.newBlock,
					maxHeightPrevoted: defaults.lastBlock.maxHeightPrevoted,
					height: defaults.lastBlock.height + 1,
				};

				expect(bftInstance.forkChoice(aNewBlock, defaults.lastBlock)).toEqual(
					FORK_STATUS_DIFFERENT_CHAIN,
				);
			});

			it('should return FORK_STATUS_DISCARD if no conditions are met', () => {
				const aNewBlock = {
					...defaults.newBlock,
					height: defaults.lastBlock.height, // This way, none of the conditions are met
				};

				const lastBlock = {
					...defaults.lastBlock,
					height: 2,
				};

				expect(bftInstance.forkChoice(aNewBlock, lastBlock)).toEqual(
					FORK_STATUS_DISCARD,
				);
			});
		});

		// TODO: Remove tests for private methods
		describe('#_initFinalityManager', () => {
			it('should call ChainMetaEntity.getKey to get stored finalized height', async () => {
				const bft = new BFT(bftParams);
				const result = await bft._initFinalityManager();

				expect(storageMock.entities.ChainMeta.getKey).toHaveBeenCalledTimes(1);
				expect(storageMock.entities.ChainMeta.getKey).toHaveBeenCalledWith(
					'BFT.finalizedHeight',
				);
				expect(result).toBeInstanceOf(FinalityManager);
			});

			it('should initialize finalityManager with stored FINALIZED_HEIGHT if its highest', async () => {
				// Arrange
				const finalizedHeight = 500;
				const startingHeightLower = 300;
				storageMock.entities.ChainMeta.getKey.mockReturnValue(finalizedHeight);
				const bft = new BFT({
					...bftParams,
					...{ startingHeight: startingHeightLower },
				});

				// Act
				const finalityManager = await bft._initFinalityManager();

				// Assert
				expect(finalityManager).toBeInstanceOf(FinalityManager);
				expect(finalityManager.activeDelegates).toEqual(activeDelegates);
				expect(finalityManager.finalizedHeight).toEqual(finalizedHeight);
			});

			it('should initialize finalityManager with stored startingHeight - TWO_ROUNDS if its highest', async () => {
				// Arrange
				const finalizedHeight = 500;
				const startingHeightHigher = 800;
				storageMock.entities.ChainMeta.getKey.mockReturnValue(finalizedHeight);
				const bft = new BFT({
					...bftParams,
					...{ startingHeight: startingHeightHigher },
				});

				// Act
				const finalityManager = await bft._initFinalityManager();

				// Assert
				expect(finalityManager).toBeInstanceOf(FinalityManager);
				expect(finalityManager.activeDelegates).toEqual(activeDelegates);
				expect(finalityManager.finalizedHeight).toEqual(
					startingHeightHigher - activeDelegates * 2,
				);
			});
		});

		describe('#_getLastBlockHeight', () => {
			it('should call BlockEntity.get with particular parameters', async () => {
				const bft = new BFT(bftParams);
				storageMock.entities.Block.get.mockReturnValue([]);

				await bft._getLastBlockHeight();

				expect(storageMock.entities.Block.get).toHaveBeenCalledTimes(1);
				expect(storageMock.entities.Block.get).toHaveBeenCalledWith(
					{},
					{
						limit: 1,
						sort: 'height:desc',
					},
				);
			});

			it('should return block height if block available', async () => {
				const bft = new BFT(bftParams);

				const lastBlockHeight = 5;
				const block = { height: lastBlockHeight };
				storageMock.entities.Block.get.mockReturnValue([block]);

				const result = await bft._getLastBlockHeight();

				expect(result).toEqual(lastBlockHeight);
			});

			it('should return zero if no block available', async () => {
				const bft = new BFT(bftParams);
				storageMock.entities.Block.get.mockReturnValue([]);

				await bft._getLastBlockHeight();

				const result = await bft._getLastBlockHeight();

				expect(result).toEqual(0);
			});
		});

		describe('#_loadBlocksFromStorage', () => {
			const fromHeight = 0;
			const tillHeight = 10;
			let bft;

			beforeEach(async () => {
				bft = new BFT(bftParams);
				storageMock.entities.Block.get.mockReturnValue([]);
				await bft.init();
			});

			it('should call fetch blocks from storage particular parameters', async () => {
				// Arrange
				storageMock.entities.Block.get.mockClear();
				const minActiveHeightsOfDelegates = {};

				// Act
				await bft._loadBlocksFromStorage({
					fromHeight,
					tillHeight,
					minActiveHeightsOfDelegates,
				});

				// Assert
				expect(storageMock.entities.Block.get).toHaveBeenCalledTimes(1);
				expect(storageMock.entities.Block.get).toHaveBeenCalledWith(
					{
						height_gte: fromHeight,
						height_lte: tillHeight,
					},
					{
						limit: null,
						sort: 'height:asc',
					},
				);
			});

			// As BFT applies only to block version 2
			it('should skip loading blocks with version !== 2', async () => {
				// Arrange
				const blockWithVersion1 = blockFixture({ version: 1 });
				const blockWithVersion2 = blockFixture({ version: 2 });
				storageMock.entities.Block.get.mockReturnValue([
					blockWithVersion1,
					blockWithVersion2,
				]);
				const delegateMinHeightActive = 1;
				const minActiveHeightsOfDelegates = {
					[blockWithVersion2.generatorPublicKey]: {
						publicKey: blockWithVersion2.generatorPublicKey,
						// activeMinHeight value is not important in this scenario
						activeHeights: [delegateMinHeightActive],
					},
				};

				// Act
				await bft._loadBlocksFromStorage({
					fromHeight,
					tillHeight,
					minActiveHeightsOfDelegates,
				});

				// Assert
				expect(bft.finalityManager.headers.length).toEqual(1);
				expect(bft.finalityManager.headers.items).toEqual([
					extractBFTBlockHeaderFromBlock({
						...blockWithVersion2,
						delegateMinHeightActive,
					}),
				]);
			});

			it('should load block headers to finalityManager', async () => {
				// Arrange
				const block = blockFixture({ version: 2, height: 520 });
				const delegateMinHeightActive = 405;
				const minActiveHeightsOfDelegates = {
					[block.generatorPublicKey]: {
						publicKey: block.generatorPublicKey,
						activeHeights: [delegateMinHeightActive],
					},
				};
				const blockHeader = extractBFTBlockHeaderFromBlock({
					...block,
					delegateMinHeightActive,
				});
				storageMock.entities.Block.get.mockReturnValue([block]);

				// Act
				await bft._loadBlocksFromStorage({
					fromHeight,
					tillHeight,
					minActiveHeightsOfDelegates,
				});

				// Assert
				expect(bft.finalityManager.headers.items.length).toEqual(1);
				expect(bft.finalityManager.headers.items).toEqual([blockHeader]);
			});
		});
	});
});
