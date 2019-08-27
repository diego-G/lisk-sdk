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

const BigNum = require('@liskhq/bignum');
const { TransferTransaction } = require('@liskhq/lisk-transactions');
const { Slots } = require('../../../../../../../src/modules/chain/dpos');
const { Blocks } = require('../../../../../../../src/modules/chain/blocks');
const genesisBlock = require('../../../../../../fixtures/config/devnet/genesis_block.json');
const { newBlock, getBytes } = require('./utils.js');

// TODO: Share fixture generation b/w mocha and jest
const randomUtils = require('../../../../../../mocha/common/utils/random.js');

describe('blocks', () => {
	const stubs = {};
	const constants = {
		blockReceiptTimeout: 20,
		loadPerIteration: 1000,
		maxPayloadLength: 1024 * 1024,
		maxTransactionsPerBlock: 25,
		activeDelegates: 101,
		rewardDistance: 3000000,
		rewardOffset: 2160,
		rewardMileStones: [
			'500000000', // Initial Reward
			'400000000', // Milestone 1
			'300000000', // Milestone 2
			'200000000', // Milestone 3
			'100000000', // Milestone 4
		],
		totalAmount: '10000000000000000',
		blockSlotWindow: 5,
		blockTime: 10,
		epochTime: new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)).toISOString(),
	};
	let exceptions = {};
	let blocksInstance;
	let slots;

	beforeEach(() => {
		// Arrange
		stubs.dependencies = {
			interfaceAdapters: {
				transactions: {
					fromBlock: jest.fn(),
				},
			},
			storage: {
				entities: {
					Account: {
						get: jest.fn(),
						update: jest.fn(),
					},
					Block: {
						begin: jest.fn(),
						count: jest.fn(),
						getOne: jest.fn(),
						get: jest.fn(),
					},
					Round: {
						getUniqueRounds: jest.fn(),
					},
				},
			},
			logger: {
				debug: jest.fn(),
				log: jest.fn(),
				error: jest.fn(),
			},
			roundsModule: {},
		};

		slots = new Slots({
			epochTime: constants.epochTime,
			interval: constants.blockTime,
			blocksPerRound: constants.activeDelegates,
		});

		exceptions = {
			transactions: [],
		};

		stubs.tx = {
			batch: jest.fn(),
		};

		blocksInstance = new Blocks({
			...stubs.dependencies,
			genesisBlock,
			slots,
			exceptions,
			...constants,
		});
	});

	describe('constructor', () => {
		it('should initialize private variables correctly', async () => {
			// Assert stubbed values are assigned
			Object.entries(stubs.dependencies).forEach(([stubName, stubValue]) => {
				expect(blocksInstance[stubName]).toEqual(stubValue);
			});
			// Assert constants
			Object.entries(blocksInstance.constants).forEach(
				([constantName, constantValue]) =>
					expect(constants[constantName]).toEqual(constantValue),
			);
			// Assert miscellanious
			expect(slots).toEqual(blocksInstance.slots);
			expect(blocksInstance.blockReward).toBeDefined();
			expect(blocksInstance.blocksVerify).toBeDefined();
			return expect(blocksInstance.blocksUtils).toBeDefined();
		});
	});

	describe('lastBlock', () => {
		beforeEach(() => {
			blocksInstance._lastBlock = {
				...genesisBlock,
				receivedAt: new Date(),
			};
		});
		it('return the _lastBlock without the receivedAt property', async () => {
			// Arrange
			const { receivedAt, ...block } = genesisBlock;
			// Assert
			expect(blocksInstance.lastBlock).toEqual(block);
		});
	});

	// TODO: Confirm it is required after new implementation
	describe('isActive', () => {
		it.todo('return the _isActive property');
	});

	describe('init', () => {
		beforeEach(async () => {
			stubs.dependencies.storage.entities.Block.begin.mockImplementation(
				(_, callback) => callback.call(blocksInstance, stubs.tx),
			);
			stubs.dependencies.storage.entities.Block.count.mockResolvedValue(5);
			stubs.dependencies.storage.entities.Block.getOne.mockResolvedValue(
				genesisBlock,
			);
			stubs.dependencies.storage.entities.Block.get.mockResolvedValue([
				genesisBlock,
			]);
			stubs.dependencies.storage.entities.Round.getUniqueRounds.mockResolvedValue(
				[
					{
						round: 1,
					},
				],
			);
			stubs.tx.batch.mockImplementation(promises => Promise.all(promises));
			const random101DelegateAccounts = new Array(101)
				.fill('')
				.map(() => randomUtils.account());
			stubs.dependencies.storage.entities.Account.get.mockResolvedValue(
				random101DelegateAccounts,
			);
		});

		describe('loadMemTables', () => {
			it('should throw when entities.Block.count fails', async () => {
				expect.assertions(1);
				// Arrange
				const error = new Error('Count Error');
				stubs.dependencies.storage.entities.Block.count.mockRejectedValue(
					error,
				);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should throw when entities.Block.getOne fails', async () => {
				// Arrange
				const error = new Error('getOne Error');
				stubs.dependencies.storage.entities.Block.count.mockRejectedValue(
					error,
				);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should throw when entities.Block.getUniqueRounds fails', async () => {
				// Arrange
				const error = new Error('getUniqueRounds Error');
				stubs.dependencies.storage.entities.Block.count.mockRejectedValue(
					error,
				);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it.todo('should throw when tx.batch fails');
			it.todo('should not throw when tx.batch succeeds');
		});

		describe('matchGenesisBlock', () => {
			it('should throw an error if the genesis block id is different', async () => {
				// Arrange
				const error = new Error('Genesis block does not match');
				const mutatedGenesisBlock = {
					...genesisBlock,
					id: genesisBlock.id.replace('0', '1'),
				};
				stubs.dependencies.storage.entities.Block.getOne.mockResolvedValue(
					mutatedGenesisBlock,
				);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should throw an error if the genesis block payloadHash is different', async () => {
				// Arrange
				const error = new Error('Genesis block does not match');
				const mutatedGenesisBlock = {
					...genesisBlock,
					payloadHash: genesisBlock.payloadHash.replace('0', '1'),
				};
				stubs.dependencies.storage.entities.Block.getOne.mockResolvedValue(
					mutatedGenesisBlock,
				);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should throw an error if the genesis block signature is different', async () => {
				// Arrange
				const error = new Error('Genesis block does not match');
				const mutatedGenesisBlock = {
					...genesisBlock,
					blockSignature: genesisBlock.blockSignature.replace('0', '1'),
				};
				stubs.dependencies.storage.entities.Block.getOne.mockResolvedValue(
					mutatedGenesisBlock,
				);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should not throw when genesis block matches', async () => {
				// Act & Assert
				await expect(blocksInstance.init()).resolves.toEqual();
			});
		});

		describe('reloadRequired', () => {
			// TODO: Add tests or remove the code after the discussion on https://github.com/LiskHQ/lisk-sdk/issues/4130
			it.todo('confirm if it needs tests here');
		});

		describe('loadLastBlock', () => {
			it('should throw an error when Block.get throws error', async () => {
				// Arrange
				const error = 'get error';
				stubs.dependencies.storage.entities.Block.get.mockRejectedValue(error);

				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should throw an error when Block.get returns empty array', async () => {
				// Arrange
				const errorMessage = 'Failed to load last block';
				stubs.dependencies.storage.entities.Block.get.mockResolvedValue([]);
				expect.assertions(1);
				// Act
				try {
					await blocksInstance.init();
				} catch (error) {
					// Assert
					expect(error.message).toEqual(errorMessage);
				}
			});
			// TODO: The tests are minimal due to the changes we expect as part of https://github.com/LiskHQ/lisk-sdk/issues/4131
			describe('when Block.get returns rows', () => {
				it('should return the storage read of the first row', async () => {
					// Act
					stubs.dependencies.storage.entities.Block.get.mockResolvedValue([
						genesisBlock,
						newBlock(),
					]);
					await blocksInstance.init();
				});
			});
		});

		it('should initialize the processor', async () => {
			// Act
			await blocksInstance.init();
			// Assert
			expect(blocksInstance.lastBlock.id).toEqual(genesisBlock.id);
		});
	});

	describe('validate', () => {
		describe('validateSignature', () => {
			it('should throw when the block bytes are mutated', async () => {
				// Arrange
				const block = newBlock();
				const blockBytes = getBytes(block);
				const mutatedBlockBytes = Buffer.from(
					blockBytes.toString('hex').replace('0', '1'),
					'hex',
				);
				const errorMessage = 'Invalid block signature';
				expect.assertions(1);
				// Act
				try {
					await blocksInstance.validate({
						block,
						lastBlock: genesisBlock,
						blockBytes: mutatedBlockBytes,
					});
				} catch (error) {
					// Assert
					expect(error.message).toEqual(errorMessage);
				}
			});

			it('should throw when the block signature is mutated', async () => {
				// Arrange
				const block = newBlock();
				const blockBytes = getBytes(block);
				const blockWithMutatedSignature = {
					...block,
					blockSignature: block.blockSignature.replace('0', '1'),
				};
				const errorMessage = 'Invalid block signature';
				expect.assertions(1);
				// Act
				try {
					await blocksInstance.validate({
						block: blockWithMutatedSignature,
						lastBlock: genesisBlock,
						blockBytes,
					});
				} catch (error) {
					// Assert
					expect(error.message).toEqual(errorMessage);
				}
			});

			it('should throw when generator public key is different', async () => {
				// Arrange
				const block = newBlock();
				const blockBytes = getBytes(block);
				const blockWithDifferentGeneratorPublicKey = {
					...block,
					generatorPublicKey: randomUtils.account().publicKey,
				};
				const errorMessage = 'Invalid block signature';
				expect.assertions(1);
				// Act
				try {
					await blocksInstance.validate({
						block: blockWithDifferentGeneratorPublicKey,
						lastBlock: genesisBlock,
						blockBytes,
					});
				} catch (error) {
					// Assert
					expect(error.message).toEqual(errorMessage);
				}
			});
		});

		describe('validatePreviousBlock', () => {
			it("should throw when the previous block doesn't exist and the block is not genesis block", async () => {
				// Arrange
				const block = newBlock({ previousBlock: null });
				const blockBytes = getBytes(block);
				const errorMessage = 'Invalid previous block';
				expect.assertions(1);
				// Act
				try {
					await blocksInstance.validate({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					});
				} catch (error) {
					// Assert
					expect(error.message).toEqual(errorMessage);
				}
			});

			it("should not throw when previous block doesn't exist and block height = 1", async () => {
				// Arrange
				const block = newBlock({
					height: 1,
					previousBlock: undefined,
				});
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act
				await expect(
					blocksInstance.validate({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).resolves.toBeUndefined();
			});
		});

		describe('validateReward', () => {
			// should not throw if block height === 1? (Where should the test go)
			it('should throw if the expected reward does not match the reward property in block object', async () => {
				// Arrange
				const block = newBlock({ reward: '1' });
				const blockBytes = getBytes(block);
				const errorMessage = 'Invalid block reward: 1 expected: 0';
				expect.assertions(1);
				// Act
				try {
					await blocksInstance.validate({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					});
				} catch (error) {
					// Assert
					expect(error.message).toEqual(errorMessage);
				}
			});

			it('should not throw if the expected reward does not match the reward property in block object but the block id included in exception', async () => {
				// Arrange
				const block = newBlock({ reward: '1' });
				exceptions.blockRewards = [block.id];
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act
				return expect(
					blocksInstance.validate({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).resolves.toBeUndefined();
			});

			it('should not throw if block height === 1', async () => {
				// Arrange
				const block = newBlock({ height: 1, reward: '1' });
				exceptions.blockRewards = [block.id.replace('1', '0')];
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validate({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).resolves.toBeUndefined();
			});
		});

		describe('validatePayload', () => {
			it('should throw if the payload size is bigger than maxPayloadLength', async () => {
				// Arrange
				const block = newBlock({
					payloadLength: constants.maxPayloadLength + 1,
				});
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validate({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toThrow('Payload length is too long');
			});

			it('should throw if the transactions array is not equal to numberOfTransactions', async () => {
				// Arrange
				const transactions = new Array(10)
					.fill('')
					.map(() => new TransferTransaction(randomUtils.transaction()));
				const block = newBlock({ numberOfTransactions: 1, transactions });
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validate({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toThrow(
					'Included transactions do not match block transactions count',
				);
			});

			it('should throw if the transactions array is more than maxTransactionsPerBlock', async () => {
				// Arrange
				const transactions = new Array(constants.maxTransactionsPerBlock + 1)
					.fill('')
					.map(() => new TransferTransaction(randomUtils.transaction()));
				const block = newBlock({ transactions });
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validate({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toThrow('Number of transactions exceeds maximum per block');
			});

			it('should throw if there are duplicate transaction ids', async () => {
				// Arrange
				const duplicateTransaction = new TransferTransaction(
					randomUtils.transaction(),
				);
				const block = newBlock({
					numberOfTransactions: 1,
					transactions: [duplicateTransaction, duplicateTransaction],
				});
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validate({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toThrow(
					'Included transactions do not match block transactions count',
				);
			});

			it('should throw if the calculated payload hash is not equal to payloadHash property in block object', async () => {
				// Arrange
				const block = newBlock();
				const blockBytes = getBytes(block);
				const blockWithDifferentPayloadhash = {
					...block,
					payloadHash: block.payloadHash.replace('0', '1'),
				};
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validate({
						block: blockWithDifferentPayloadhash,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toThrow('Invalid payload hash');
			});

			it('should throw if the calculated totalAmount is not equal to totalAmount property in block object', async () => {
				// Arrange
				const block = newBlock();
				const blockBytes = getBytes(block);
				const blockWithDifferentTotalAmount = {
					...block,
					totalAmount: new BigNum('12'),
				};
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validate({
						block: blockWithDifferentTotalAmount,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toThrow('Invalid total amount');
			});

			it('should throw if the calculated totalFee is not equal to totalFee property in block object', async () => {
				// Arrange
				const block = newBlock();
				const blockBytes = getBytes(block);
				const blockWithDifferentTotalAmount = {
					...block,
					totalFee: new BigNum('1'),
				};
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validate({
						block: blockWithDifferentTotalAmount,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toThrow('Invalid total fee');
			});
		});

		describe('validateBlockSlot', () => {
			it('should throw when block timestamp is in the future', async () => {
				// Arrange
				const futureTimestamp = slots.getSlotTime(slots.getNextSlot());
				const block = newBlock({ timestamp: futureTimestamp });
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validate({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toThrow('Invalid block timestamp');
			});

			it('should throw when block timestamp is earlier than lastBlock timestamp', async () => {
				// Arrange
				const futureTimestamp = slots.getSlotTime(slots.getNextSlot());
				const block = newBlock({ timestamp: futureTimestamp });
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validate({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toThrow('Invalid block timestamp');
			});

			it('should throw when block timestamp is equal to the lastBlock timestamp', async () => {
				// Arrange
				const lastBlock = newBlock({});
				const block = newBlock({
					previousBlock: lastBlock.id,
					height: lastBlock.height + 1,
				});
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validate({
						block,
						lastBlock,
						blockBytes,
					}),
				).rejects.toThrow('Invalid block timestamp');
			});
		});

		it('should reassign the id property for block object', async () => {
			// Arrange
			const block = newBlock();
			const blockBytes = getBytes(block);
			const originalId = block.id;
			const mutatedId = block.id;
			block.id = mutatedId;

			expect.assertions(1);
			// Act & Assert
			await blocksInstance.validate({
				block,
				lastBlock: genesisBlock,
				blockBytes,
			});
			expect(block.id).toEqual(originalId);
		});

		describe('validateTransactions', () => {
			// Question: What should be exactly done here
			it.todo('should call validateTransactions with expected parameters');
			it.todo('should throw errors of the first invalid Transaction');
			it.todo('should not throw when there are no errors');
		});
	});

	// TODO: decide first if we need this function
	describe('validateNew', () => {});

	describe('forkChoice', () => {
		// We must have these tests somewhere
	});

	describe('verify', () => {
		it.todo('should throw in case the block id exists in the last n blocks');
		it.todo('should throw in case the block id exists in the last n blocks');
	});

	describe('apply', () => {
		it.todo('should not perform any action if transactions is an empty array');
		it.todo('should not call apply transactions for inert transactions');
		it.todo('should throw the errors for first unappliable transactions');
		it.todo('should update account state when transactions are appliable');
		it.todo('should update round state when transactions are appliable');
	});

	describe('applyGenesis', () => {
		it.todo(
			'should call transactionsModule.applyGenesisTransactions by sorting transactions',
		);
		it.todo('should account state when transactions are appliable');
		it.todo('should round state when transactions are appliable');
	});

	describe('undo', () => {
		it.todo('should not perform any action if transactions is an empty array');
		it.todo('should not call undoTransactions for inert transactions');
		it.todo('should throw the errors for first unundoable transaction');
		it.todo('should update account state when transactions are reverted');
		it.todo('should update round state when transactions are reverted');
	});

	describe('save', () => {
		it.todo('should save the block in the database');
		it.todo('should throw error when block cannot be saved in the database');
		it.todo('should perform tick for rounds module');
	});

	describe('saveGenesis', () => {
		it.todo('should not save the block when skipSave is set to true');
		it.todo(
			'should save the block in the database when skipSave is set to false',
		);
		it.todo('should throw error when block cannot be saved in the database');
		it.todo('should perform tick for rounds module');
	});

	describe('remove', () => {
		it.todo('should throw an error when removing genesis block');
		it.todo(
			'should throw an error when previous block does not exist in the database',
		);
		it.todo('should throw an error when deleting block fails');
		it.todo(
			'should not create entry in temp block table saveToTemp flag is false',
		);
		describe('when saveToTemp parameter is set to true', () => {
			it.todo('should not mutate the last block object');
			it.todo(
				'should create entry in temp block with string value of reward if it exists',
			);
			it.todo(
				"should create entry in temp block without reward property if it does't exists",
			);
			it.todo(
				'should create entry in temp block with string value of totalAmount if it exists',
			);
			it.todo(
				"should create entry in temp block without totalAmount property if it does't exists",
			);
			it.todo(
				'should create entry in temp block with string value of totalFee if it exists',
			);
			it.todo(
				"should create entry in temp block without totalFee property if it does't exists",
			);
			it.todo(
				'should create entry in temp block by adding blockId property for transactions',
			);
			it.todo('should create entry in temp block with json transactions array');
			it.todo(
				'should create entry in temp block with correct id, height and block property and tx',
			);
		});
		it.todo(
			'should not create entry in temp block table if saveToTemp parameter is false',
		);
	});

	describe('exists', () => {
		it.todo("should return true if the block doesn't exist");
		it.todo('should return false if the block does exist');
	});

	describe('filterReadyTransactions', () => {});

	describe('broadcast', () => {
		it.todo('should clone block and emit EVENT_BROADCAST_BLOCK event');
	});

	describe('cleanup', () => {});

	describe('deleteLastBlockAndGet', () => {
		it.todo('should remove the last block');
		it.todo('should clone block and emit EVENT_BROADCAST_BLOCK event');
		it.todo('should throw in case removing block fails');
		it.todo('should return new last block');
	});

	describe('loadBlocksDataWs', () => {
		it.todo('a');
	});

	describe('readBlocksFromNetwork', () => {
		it.todo('b');
	});

	describe('getHighestCommonBlock', () => {
		it.todo(
			'should get the block with highest height in the blockchain if provided ids parameter is empty',
		);
		it.todo(
			'should get the block with highest height from provided ids parameter',
		);
		it.todo('should throw error if unable to get blocks from the storage');
	});
});
