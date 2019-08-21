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
 */

'use strict';

const {
	FakeBlockProcessorV0,
	FakeBlockProcessorV1,
} = require('./block_processor');
const {
	Processor,
} = require('../../../../../../../src/modules/chain/processor');
const {
	Sequence,
} = require('../../../../../../../src/modules/chain/utils/sequence');
const {
	FORK_STATUS_IDENTICAL_BLOCK,
	FORK_STATUS_DOUBLE_FORGING,
	FORK_STATUS_TIE_BREAK,
	FORK_STATUS_DIFFERENT_CHAIN,
	FORK_STATUS_DISCARD,
	FORK_STATUS_VALID_BLOCK,
} = require('../../../../../../../src/modules/chain/blocks');

describe('processor', () => {
	const defaultLastBlock = {
		id: 'lastId',
	};

	const defaultBlockBytes = Buffer.from('block-bytes', 'utf8');

	let processor;
	let channelStub;
	let storageStub;
	let loggerStub;
	let blocksModuleStub;
	let blockProcessorV0;

	beforeEach(async () => {
		channelStub = {
			publish: jest.fn(),
		};
		storageStub = {
			entities: {
				Block: {
					begin: jest.fn(),
				},
			},
		};
		loggerStub = {
			debug: jest.fn(),
			info: jest.fn(),
			error: jest.fn(),
		};
		blocksModuleStub = {
			save: jest.fn(),
			saveGenesis: jest.fn(),
			remove: jest.fn(),
			exists: jest.fn(),
		};
		Object.defineProperty(blocksModuleStub, 'lastBlock', {
			get: jest.fn().mockReturnValue(defaultLastBlock),
		});
		processor = new Processor({
			channel: channelStub,
			storage: storageStub,
			logger: loggerStub,
			blocksModule: blocksModuleStub,
		});

		blockProcessorV0 = new FakeBlockProcessorV0();
	});

	describe('constructor', () => {
		describe('when the instance is created', () => {
			it('should initialize the processors', async () => {
				expect(processor.processors).toEqual({});
			});

			it('should initialize the matchers', async () => {
				expect(processor.matchers).toEqual({});
			});

			it('should initialize the sequence', async () => {
				expect(processor.sequence).toBeInstanceOf(Sequence);
			});

			it('should assign channel to its context', async () => {
				expect(processor.channel).toBe(channelStub);
			});

			it('should assign storage to its context', async () => {
				expect(processor.storage).toBe(storageStub);
			});

			it('should assign blocks module to its context', async () => {
				expect(processor.blocksModule).toBe(blocksModuleStub);
			});

			it('should assign logger to its context', async () => {
				expect(processor.logger).toBe(loggerStub);
			});
		});
	});

	describe('register', () => {
		describe('when processor is register without version property', () => {
			it('should throw an error', async () => {
				expect(() => processor.register({})).toThrow(
					'version property must exist for processor',
				);
			});
		});

		describe('when processor is register without matcher', () => {
			it('should set the processors with the version key', async () => {
				processor.register(blockProcessorV0);
				expect(processor.processors[0]).toBe(blockProcessorV0);
			});

			it('should set a functions always return true to the matchers with the version key', async () => {
				processor.register(blockProcessorV0);
				expect(processor.matchers[0]()).toBe(true);
			});
		});

		describe('when processor is register with matcher', () => {
			it('should set the processor with the version key', async () => {
				processor.register(blockProcessorV0, {
					matcher: ({ height }) => height === 0,
				});
				expect(processor.processors[0]).toBe(blockProcessorV0);
			});

			it('should set the functions to the matchers with the version key', async () => {
				processor.register(blockProcessorV0, {
					matcher: ({ height }) => height === 0,
				});
				expect(processor.matchers[0]({ height: 0 })).toBe(true);
				expect(processor.matchers[0]({ height: 10 })).toBe(false);
			});
		});
	});

	describe('init', () => {
		const genesisBlock = { id: 'fakeGenesisBlock', version: 0 };

		let initSteps;
		let applyGenesisSteps;
		let txStub;

		beforeEach(async () => {
			initSteps = [jest.fn(), jest.fn()];
			applyGenesisSteps = [jest.fn(), jest.fn()];
			txStub = jest.fn();
			blockProcessorV0.init.pipe(initSteps);
			blockProcessorV0.applyGenesis.pipe(applyGenesisSteps);
			processor.register(blockProcessorV0);
		});

		describe('when genesis block does not exist on the storage', () => {
			beforeEach(async () => {
				blocksModuleStub.exists.mockResolvedValue(false);

				await processor.init(genesisBlock);
				await storageStub.entities.Block.begin.mock.calls[0][1](txStub);
			});

			it('should check if genesis block exists', async () => {
				expect(blocksModuleStub.exists).toHaveBeenCalledTimes(1);
			});

			it('should call all of the apply genesis steps', async () => {
				applyGenesisSteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{ block: genesisBlock, tx: txStub },
						undefined,
					);
				});
			});

			it('should save the genesis block', async () => {
				expect(blocksModuleStub.saveGenesis).toHaveBeenCalledWith({
					block: genesisBlock,
					tx: txStub,
					skipSave: false,
				});
			});
		});

		describe('when the genesis block already exists', () => {
			beforeEach(async () => {
				blocksModuleStub.exists.mockResolvedValue(true);

				await processor.init(genesisBlock);
				await storageStub.entities.Block.begin.mock.calls[0][1](txStub);
			});

			it('should check if genesis block exists', async () => {
				expect(blocksModuleStub.exists).toHaveBeenCalledTimes(1);
			});

			it('should not call any of the apply genesis steps', async () => {
				applyGenesisSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not save the genesis block', async () => {
				expect(blocksModuleStub.saveGenesis).not.toHaveBeenCalled();
			});
		});

		describe('when processor fails to initialize', () => {
			it('should throw an error', async () => {
				initSteps[0].mockRejectedValue(new Error('failed to proceess init'));
				await expect(processor.init(genesisBlock)).rejects.toThrow(
					'failed to proceess init',
				);
			});
		});
	});

	describe('process', () => {
		const blockV0 = { id: 'fakelock1', version: 0, height: 99 };
		const blockV1 = { id: 'fakelock2', version: 1, height: 100 };

		let forkSteps;
		let validateNewSteps;
		let validateSteps;
		let verifySteps;
		let applySteps;
		let undoSteps;
		let getBytesSteps;
		let txStub;

		beforeEach(async () => {
			forkSteps = [jest.fn().mockResolvedValue(1)];
			validateSteps = [jest.fn(), jest.fn()];
			validateNewSteps = [jest.fn(), jest.fn()];
			verifySteps = [jest.fn(), jest.fn()];
			applySteps = [jest.fn(), jest.fn()];
			undoSteps = [jest.fn(), jest.fn()];
			getBytesSteps = [jest.fn().mockResolvedValue(defaultBlockBytes)];
			txStub = jest.fn();
			blockProcessorV0.fork.pipe(forkSteps);
			blockProcessorV0.validateNew.pipe(validateNewSteps);
			blockProcessorV0.validate.pipe(validateSteps);
			blockProcessorV0.verify.pipe(verifySteps);
			blockProcessorV0.apply.pipe(applySteps);
			blockProcessorV0.undo.pipe(undoSteps);
			blockProcessorV0.getBytes.pipe(getBytesSteps);
			processor.register(blockProcessorV0, {
				matcher: ({ height }) => height < 100,
			});
		});

		describe('when only 1 processor is registered', () => {
			it('should throw an error if the matching block version does not exist', async () => {
				await expect(processor.process(blockV1)).rejects.toThrow(
					'Block processing version is not registered',
				);
			});

			it('should call fork pipelines with matching processor', async () => {
				await processor.process(blockV0);
				forkSteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when more than 2 processor is registered', () => {
			let blockProcessorV1;
			let forkSteps2;

			beforeEach(async () => {
				blockProcessorV1 = new FakeBlockProcessorV1();
				forkSteps2 = [jest.fn(), jest.fn()];
				forkSteps2[1].mockResolvedValue(2);
				blockProcessorV1.fork.pipe(forkSteps2);
				processor.register(blockProcessorV1);
			});

			it('should call fork pipelines with matching processor', async () => {
				await processor.process(blockV1);
				forkSteps2.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when the fork step returns unknown fork status', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(undefined);
			});

			it('should throw an error', async () => {
				await expect(processor.process(blockV0)).rejects.toThrow(
					'Unknown fork status',
				);
			});
		});

		describe('when the fork step returns FORK_STATUS_IDENTICAL_BLOCK', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(FORK_STATUS_IDENTICAL_BLOCK);
				await processor.process(blockV0);
			});

			it('should not validate for new block ', async () => {
				validateNewSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not validate block', async () => {
				validateSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not verify block', async () => {
				verifySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not apply block', async () => {
				applySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not save block', async () => {
				expect(storageStub.entities.Block.begin).not.toHaveBeenCalled();
				expect(blocksModuleStub.save).not.toHaveBeenCalled();
			});

			it('should not publish any event', async () => {
				expect(channelStub.publish).not.toHaveBeenCalled();
			});
		});

		describe('when the fork step returns FORK_STATUS_DOUBLE_FORGING', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(FORK_STATUS_DOUBLE_FORGING);
				await processor.process(blockV0);
			});

			it('should not validate for new block ', async () => {
				validateNewSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not validate block', async () => {
				validateSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not verify block', async () => {
				verifySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not apply block', async () => {
				applySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not save block', async () => {
				expect(storageStub.entities.Block.begin).not.toHaveBeenCalled();
				expect(blocksModuleStub.save).not.toHaveBeenCalled();
			});

			it('should not publish any event', async () => {
				expect(channelStub.publish).not.toHaveBeenCalled();
			});
		});

		describe('when the fork step returns FORK_STATUS_TIE_BREAK and success to process', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(FORK_STATUS_TIE_BREAK);
				await processor.process(blockV0);
				await storageStub.entities.Block.begin.mock.calls[0][1](txStub);
				await storageStub.entities.Block.begin.mock.calls[1][1](txStub);
			});

			it('should validate for new block ', async () => {
				validateNewSteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{ block: blockV0, lastBlock: defaultLastBlock },
						undefined,
					);
				});
			});

			it('should validate block', async () => {
				validateSteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV0,
							lastBlock: defaultLastBlock,
							blockBytes: defaultBlockBytes,
						},
						undefined,
					);
				});
			});

			it('should revert the last block', async () => {
				undoSteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{ block: defaultLastBlock, tx: txStub },
						undefined,
					);
				});
				expect(blocksModuleStub.remove).toHaveBeenCalledWith({
					block: defaultLastBlock,
					tx: txStub,
				});
			});

			it('should emit deleteBlock event for the last block', async () => {
				expect(channelStub.publish).toHaveBeenCalledWith(
					'chain:process:deleteBlock',
					{ block: defaultLastBlock },
				);
			});

			it('should verify the block', async () => {
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV0,
							lastBlock: defaultLastBlock,
							blockBytes: defaultBlockBytes,
							tx: txStub,
						},
						undefined,
					);
				});
			});

			it('should apply the block', async () => {
				applySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV0,
							lastBlock: defaultLastBlock,
							blockBytes: defaultBlockBytes,
							tx: txStub,
						},
						undefined,
					);
				});
			});

			it('should save the block', async () => {
				expect(blocksModuleStub.save).toHaveBeenCalledWith({
					block: blockV0,
					tx: txStub,
				});
			});

			it('should emit newBlock event for the block', async () => {
				expect(channelStub.publish).toHaveBeenCalledWith(
					'chain:process:newBlock',
					{ block: blockV0 },
				);
			});

			it('should emit broadcast event for the block', async () => {
				expect(channelStub.publish).toHaveBeenCalledWith(
					'chain:process:broadcast',
					{ block: blockV0 },
				);
			});
		});

		describe('when the fork step returns FORK_STATUS_TIE_BREAK and fail to process', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(FORK_STATUS_TIE_BREAK);
				// Storage begin does not work well with stubbing with callback
				getBytesSteps[0]
					.mockResolvedValueOnce(defaultBlockBytes)
					.mockRejectedValueOnce(new Error('Fails to apply block'))
					.mockResolvedValueOnce(defaultBlockBytes);
				try {
					await processor.process(blockV0);
					await storageStub.entities.Block.begin.mock.calls[0][1](txStub);
					await storageStub.entities.Block.begin.mock.calls[1][1](txStub);
				} catch (err) {
					// Expected error
				}
			});

			it('should validate for new block ', async () => {
				validateNewSteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{ block: blockV0, lastBlock: defaultLastBlock },
						undefined,
					);
				});
			});

			it('should validate block', async () => {
				validateSteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV0,
							lastBlock: defaultLastBlock,
							blockBytes: defaultBlockBytes,
						},
						undefined,
					);
				});
			});

			it('should revert the last block', async () => {
				undoSteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{ block: defaultLastBlock, tx: txStub },
						undefined,
					);
				});
				expect(blocksModuleStub.remove).toHaveBeenCalledWith({
					block: defaultLastBlock,
					tx: txStub,
				});
			});

			it('should emit deleteBlock event for the last block', async () => {
				expect(channelStub.publish).toHaveBeenCalledWith(
					'chain:process:deleteBlock',
					{ block: defaultLastBlock },
				);
			});

			it('should not emit broadcast event for the block', async () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'chain:process:broadcast',
					expect.anything(),
				);
			});

			it('should verify the last block', async () => {
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: defaultLastBlock,
							lastBlock: defaultLastBlock,
							blockBytes: defaultBlockBytes,
							tx: txStub,
						},
						undefined,
					);
				});
			});

			it('should apply the last block', async () => {
				applySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: defaultLastBlock,
							lastBlock: defaultLastBlock,
							blockBytes: defaultBlockBytes,
							tx: txStub,
						},
						undefined,
					);
				});
			});

			it('should save the last block', async () => {
				expect(blocksModuleStub.save).toHaveBeenCalledWith({
					block: defaultLastBlock,
					tx: txStub,
				});
			});

			it('should emit newBlock event for the last block', async () => {
				expect(channelStub.publish).toHaveBeenCalledWith(
					'chain:process:newBlock',
					{ block: defaultLastBlock },
				);
			});
		});

		describe('when the fork step returns FORK_STATUS_DIFFERENT_CHAIN', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(FORK_STATUS_DIFFERENT_CHAIN);
				await processor.process(blockV0);
			});

			it('should not validate for new block ', async () => {
				validateNewSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not validate block', async () => {
				validateSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not verify block', async () => {
				verifySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not apply block', async () => {
				applySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not save block', async () => {
				expect(storageStub.entities.Block.begin).not.toHaveBeenCalled();
				expect(blocksModuleStub.save).not.toHaveBeenCalled();
			});

			it('should not publish sync', async () => {
				expect(channelStub.publish).toHaveBeenCalledWith('chain:process:sync');
			});
		});

		describe('when the fork step returns FORK_STATUS_DISCARD', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(FORK_STATUS_DISCARD);
				await processor.process(blockV0);
			});

			it('should not validate for new block ', async () => {
				validateNewSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not validate block', async () => {
				validateSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not verify block', async () => {
				verifySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not apply block', async () => {
				applySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not save block', async () => {
				expect(storageStub.entities.Block.begin).not.toHaveBeenCalled();
				expect(blocksModuleStub.save).not.toHaveBeenCalled();
			});

			it('should not publish any event', async () => {
				expect(channelStub.publish).not.toHaveBeenCalled();
			});
		});

		describe('when the fork step returns FORK_STATUS_VALID_BLOCK', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(FORK_STATUS_VALID_BLOCK);
				await processor.process(blockV0);
				await storageStub.entities.Block.begin.mock.calls[0][1](txStub);
			});

			it('should validate for new block ', async () => {
				validateNewSteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});

			it('should validate block', async () => {
				validateSteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});

			it('should verify block', async () => {
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});

			it('should apply block', async () => {
				applySteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});

			it('should save block', async () => {
				expect(storageStub.entities.Block.begin).toHaveBeenCalledTimes(1);
				expect(blocksModuleStub.save).toHaveBeenCalledTimes(1);
			});

			it('should broadcast with the block', async () => {
				expect(channelStub.publish).toHaveBeenCalledWith(
					'chain:process:broadcast',
					{ block: blockV0 },
				);
			});

			it('should emit newBlock event with the block', async () => {
				expect(channelStub.publish).toHaveBeenCalledWith(
					'chain:process:newBlock',
					{ block: blockV0 },
				);
			});
		});
	});

	describe('create', () => {
		describe('when only 1 processor is registered', () => {});

		describe('when more than 2 processor is registered', () => {});
	});

	describe('validate', () => {
		describe('when only 1 processor is registered', () => {});

		describe('when more than 2 processor is registered', () => {});
	});

	describe('processValidated', () => {
		describe('when only 1 processor is registered', () => {});

		describe('when more than 2 processor is registered', () => {});

		describe('when block is not verifiable', () => {});

		describe('when block is not applicable', () => {});

		describe('when block cannot be saved', () => {});

		describe('when block successfully processed', () => {});
	});

	describe('apply', () => {
		describe('when only 1 processor is registered', () => {});

		describe('when more than 2 processor is registered', () => {});

		describe('when block is not verifiable', () => {});

		describe('when block is not applicable', () => {});

		describe('when block successfully processed', () => {});
	});

	describe('deleteLastBlock', () => {
		describe('when only 1 processor is registered', () => {});

		describe('when more than 2 processor is registered', () => {});

		describe('when undo step fails', () => {});

		describe('when removing block fails', () => {});
	});
});
