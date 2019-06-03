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
	getPrivateAndPublicKeyBytesFromPassphrase,
} = require('@liskhq/lisk-cryptography');
const { transfer } = require('@liskhq/lisk-transactions');
const _ = require('lodash');
const async = require('async');
const Bignum = require('../../../../../src/modules/chain/helpers/bignum');
const application = require('../../../common/application');
const { clearDatabaseTable } = require('../../../common/storage_sandbox');
const modulesLoader = require('../../../common/modules_loader');
const random = require('../../../common/utils/random');
const {
	registeredTransactions,
} = require('../../../common/registered_transactions');
const {
	TransactionInterfaceAdapter,
} = require('../../../../../src/modules/chain/interface_adapters');
const accountFixtures = require('../../../fixtures/accounts');
const genesisDelegates = require('../../../data/genesis_delegates.json')
	.delegates;
const { BlockSlots } = require('../../../../../src/modules/chain/blocks');
const blocksLogic = require('../../../../../src/modules/chain/blocks/block');
const blockVersion = require('../../../../../src/modules/chain/blocks/block_version');
const blocksUtils = require('../../../../../src/modules/chain/blocks/utils');

const { ACTIVE_DELEGATES, BLOCK_SLOT_WINDOW } = global.constants;
const { NORMALIZER } = global.__testContext.config;
const genesisBlock = __testContext.config.genesisBlock;
const interfaceAdapters = {
	transactions: new TransactionInterfaceAdapter(registeredTransactions),
};

const slots = new BlockSlots({
	epochTime: __testContext.config.constants.EPOCH_TIME,
	interval: __testContext.config.constants.BLOCK_TIME,
	blocksPerRound: __testContext.config.constants.ACTIVE_DELEGATES,
});

// const previousBlock = {
// 	blockSignature:
// 		'696f78bed4d02faae05224db64e964195c39f715471ebf416b260bc01fa0148f3bddf559127b2725c222b01cededb37c7652293eb1a81affe2acdc570266b501',
// 	generatorPublicKey:
// 		'86499879448d1b0215d59cbf078836e3d7d9d2782d56a2274a568761bff36f19',
// 	height: 488,
// 	id: '11850828211026019525',
// 	numberOfTransactions: 0,
// 	payloadHash:
// 		'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
// 	payloadLength: 0,
// 	previousBlock: '8805727971083409014',
// 	relays: 1,
// 	reward: 0,
// 	timestamp: 32578360,
// 	totalAmount: 0,
// 	totalFee: 0,
// 	transactions: [],
// 	version: 0,
// };

// const validBlock = {
// 	blockSignature:
// 		'56d63b563e00332ec31451376f5f2665fcf7e118d45e68f8db0b00db5963b56bc6776a42d520978c1522c39545c9aff62a7d5bdcf851bf65904b2c2158870f00',
// 	generatorPublicKey:
// 		'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
// 	numberOfTransactions: 2,
// 	payloadHash:
// 		'be0df321b1653c203226add63ac0d13b3411c2f4caf0a213566cbd39edb7ce3b',
// 	payloadLength: 494,
// 	height: 489,
// 	previousBlock: '11850828211026019525',
// 	reward: 0,
// 	timestamp: 32578370,
// 	totalAmount: 10000000000000000,
// 	totalFee: 0,
// 	transactions: [
// 		{
// 			type: 0,
// 			amount: '10000000000000000',
// 			fee: 0,
// 			timestamp: 0,
// 			recipientId: '16313739661670634666L',
// 			senderId: '1085993630748340485L',
// 			senderPublicKey:
// 				'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
// 			signature:
// 				'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05',
// 			id: '1465651642158264047',
// 		},
// 		{
// 			type: 3,
// 			amount: '0',
// 			fee: 0,
// 			timestamp: 0,
// 			recipientId: '16313739661670634666L',
// 			senderId: '16313739661670634666L',
// 			senderPublicKey:
// 				'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
// 			asset: {
// 				votes: [
// 					'+9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
// 					'+141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
// 					'-3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
// 					'-5d28e992b80172f38d3a2f9592cad740fd18d3c2e187745cd5f7badf285ed819',
// 				],
// 			},
// 			signature:
// 				'9f9446b527e93f81d3fb8840b02fcd1454e2b6276d3c19bd724033a01d3121dd2edb0aff61d48fad29091e222249754e8ec541132032aefaeebc312796f69e08',
// 			id: '9314232245035524467',
// 		},
// 	].map(transaction => interfaceAdapters.transactions.fromJson(transaction)),
// 	version: 0,
// 	id: '884740302254229983',
// };

let block1;

let block2;

function createBlock(
	blocksModule,
	passphrase,
	timestamp,
	transactions,
	previousBlockArgs
) {
	const keypairBytes = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);
	const keypair = {
		publicKey: keypairBytes.publicKeyBytes,
		privateKey: keypairBytes.privateKeyBytes,
	};
	transactions = transactions.map(transaction =>
		interfaceAdapters.transactions.fromJson(transaction)
	);
	blocksModule._lastBlock = previousBlockArgs;
	const newBlock = blocksLogic.create({
		blockReward: blocksModule.blockReward,
		keypair,
		timestamp,
		previousBlock: blocksModule.lastBlock,
		transactions,
		maxTransactionPerBlock: blocksModule.constants.maxTransactionPerBlock,
	});

	newBlock.id = blocksLogic.getId(newBlock);
	return newBlock;
}

function getValidKeypairForSlot(library, slot) {
	const lastBlock = genesisBlock;
	const round = slots.calcRound(lastBlock.height);

	return library.modules.rounds
		.generateDelegateList(round, null)
		.then(list => {
			const delegatePublicKey = list[slot % ACTIVE_DELEGATES];
			const passphrase = _.find(genesisDelegates, delegate => {
				return delegate.publicKey === delegatePublicKey;
			}).passphrase;
			return passphrase;
		})
		.catch(err => {
			throw err;
		});
}

describe('blocks/verify', () => {
	let library;
	let blocksProcess;
	let blocks;
	let rounds;
	let storage;

	before(done => {
		application.init(
			{
				sandbox: {
					name: 'blocks_verify',
				},
			},
			(err, scope) => {
				blocksProcess = scope.modules.blocks.blocksProcess;
				blocks = scope.modules.blocks;
				rounds = scope.modules.rounds;
				storage = scope.components.storage;

				// Set current block version to 0
				blockVersion.currentBlockVersion = 0;
				scope.modules.blocks.blocksVerify.exceptions = {
					...scope.modules.blocks.exceptions,
					blockVersions: {
						0: {
							start: 1,
							end: 150,
						},
					},
				};

				library = scope;
				library.modules.blocks._lastBlock = genesisBlock;
				// Bus gets overwritten - waiting for mem_accounts has to be done manually
				setTimeout(done, 5000);
			}
		);
	});

	afterEach(() => {
		library.modules.blocks._lastBlock = genesisBlock;
		return storage.adapter.db.none('DELETE FROM blocks WHERE height > 1');
	});

	after(done => {
		application.cleanup(done);
	});

	// Move to unit tests (already covered)
	// eslint-disable-next-line mocha/no-skipped-tests
	describe.skip('__private', () => {
		describe('verifySignature', () => {
			it('should fail when blockSignature property is not a hex string', async () => {});

			it('should fail when blockSignature property is an invalid hex string', async () => {});

			it('should fail when generatorPublicKey property is not a hex string', async () => {});

			it('should fail when generatorPublicKey property is an invalid hex string', async () => {});
		});

		describe('verifyPreviousBlock', () => {
			it('should fail when previousBlock property is missing', async () => {});
		});

		describe('verifyVersion', () => {
			it('should fail when block version != 0', async () => {});
		});

		describe('verifyReward', () => {
			it('should fail when block reward = 99 instead of 0', async () => {});
		});

		describe('verifyId', () => {
			it('should reset block id when block id is an invalid alpha-numeric string value', async () => {});

			it('should reset block id when block id is an invalid numeric string value', async () => {});

			it('should reset block id when block id is an invalid integer value', async () => {});

			it('should reset block id when block id is a valid integer value', async () => {});
		});
		/* eslint-enable mocha/no-skipped-tests */

		describe('verifyPayload', () => {
			it('should fail when payload length greater than MAX_PAYLOAD_LENGTH constant value', async () => {});

			it('should fail when transactions length != numberOfTransactions property', async () => {});

			it('should fail when transactions length > maxTransactionsPerBlock constant value', async () => {});

			it('should fail when a transaction is of an unknown type', async () => {});

			it('should fail when a transaction is duplicated', async () => {});

			it('should fail when payload hash is invalid', async () => {});

			it('should fail when summed transaction amounts do not match totalAmount property', async () => {});

			it('should fail when summed transaction fees do not match totalFee property', async () => {});
		});

		describe('verifyForkOne', () => {
			it('should fail when previousBlock value is invalid', async () => {});
		});

		describe('verifyBlockSlot', () => {
			it('should fail when block timestamp < than previousBlock timestamp', async () => {});
		});

		describe('verifyBlockSlotWindow', () => {
			describe('for current slot number', () => {
				it('should return empty result.errors array', async () => {});
			});

			describe(`for slot number ${BLOCK_SLOT_WINDOW} slots in the past`, () => {
				it('should return empty result.errors array', async () => {});
			});

			describe('for slot number in the future', () => {
				it('should call callback with error = Block slot is in the future ', async () => {});
			});

			describe(`for slot number ${BLOCK_SLOT_WINDOW +
				1} slots in the past`, () => {
				it('should call callback with error = Block slot is too old', async () => {});
			});
		});

		describe('onNewBlock', () => {
			describe('with lastNBlockIds', () => {
				describe('when onNewBlock function is called once', () => {
					it('should include block in lastNBlockIds queue', async () => {});
				});

				describe(`when onNewBlock function is called ${BLOCK_SLOT_WINDOW}times`, () => {
					it('should include blockId in lastNBlockIds queue', async () => {});
				});

				describe(`when onNewBlock function is called ${BLOCK_SLOT_WINDOW *
					2} times`, () => {
					it(`should maintain last ${BLOCK_SLOT_WINDOW} blockIds in lastNBlockIds queue`, async () => {});
				});
			});
		});

		describe('verifyAgainstLastNBlockIds', () => {
			describe('when __private.lastNBlockIds', () => {
				describe('contains block id', () => {
					it('should return result with error = Block already exists in chain', async () => {});
				});

				describe('does not contain block id', () => {
					it('should return result with no errors', async () => {});
				});
			});
		});
	});

	// TODO: Refactor this test, dataset being used is no longer valid because of BLOCK_SLOT_WINDOW check
	describe('verifyReceipt', () => {});

	describe('verifyBlock', () => {});

	describe('addBlockProperties', () => {});

	describe('deleteBlockProperties', () => {});

	// Sends a block to network, save it locally
	describe('processBlock for valid block {broadcast: true, saveBlock: true}', () => {
		it('should clear database', done => {
			async.every(
				[
					'blocks WHERE height > 1',
					'trs WHERE "blockId" != \'6524861224470851795\'',
					"mem_accounts WHERE address IN ('2737453412992791987L', '2896019180726908125L')",
					'forks_stat',
				],
				(table, seriesCb) => {
					clearDatabaseTable(
						storage,
						modulesLoader.scope.components.logger,
						table
					)
						.then(res => {
							seriesCb(null, res);
						})
						.catch(err => {
							seriesCb(err, null);
						});
				},
				err => {
					if (err) {
						return done(err);
					}
					return rounds.generateDelegateList(1, null).then(() => done());
				}
			);
		});

		it('should generate block 1', done => {
			const slot = slots.getSlotNumber();
			const time = slots.getSlotTime(slots.getSlotNumber());

			getValidKeypairForSlot(library, slot)
				.then(passphrase => {
					block1 = createBlock(blocks, passphrase, time, [], genesisBlock);
					expect(block1.version).to.equal(0);
					expect(block1.timestamp).to.equal(time);
					expect(block1.numberOfTransactions).to.equal(0);
					expect(block1.reward.isEqualTo('0')).to.be.true;
					expect(block1.totalFee.isEqualTo('0')).to.be.true;
					expect(block1.totalAmount.isEqualTo('0')).to.be.true;
					expect(block1.payloadLength).to.equal(0);
					expect(block1.transactions).to.deep.equal([]);
					expect(block1.previousBlock).to.equal(genesisBlock.id);
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('should be ok when processing block 1', async () => {
			await blocksProcess.processBlock(block1, blocks.lastBlock);
		});
	});

	describe('processBlock for invalid block {broadcast: true, saveBlock: true}', () => {
		let broadcastSpy;

		beforeEach(async () => {
			broadcastSpy = sinonSandbox.spy();
			await blocksProcess.processBlock(block1, blocks.lastBlock, broadcastSpy);
		});

		afterEach(async () => {
			sinonSandbox.restore();
		});

		it('should fail when processing block 1 multiple times', async () => {
			try {
				await blocksProcess.processBlock(
					block1,
					blocks.lastBlock,
					broadcastSpy
				);
			} catch (error) {
				expect(error.message).to.equal(`Block ${block1.id} already exists`);
			}
		});
	});

	// Receives a block from network, save it locally
	describe('processBlock for invalid block {broadcast: false, saveBlock: true}', () => {
		let invalidBlock2;

		it('should generate block 2 with invalid generator slot', done => {
			const passphrase =
				'latin swamp simple bridge pilot become topic summer budget dentist hollow seed';

			invalidBlock2 = createBlock(
				blocks,
				passphrase,
				33772882,
				[],
				genesisBlock
			);
			expect(invalidBlock2.version).to.equal(0);
			expect(invalidBlock2.timestamp).to.equal(33772882);
			expect(invalidBlock2.numberOfTransactions).to.equal(0);
			expect(invalidBlock2.reward.isEqualTo('0')).to.be.true;
			expect(invalidBlock2.totalFee.isEqualTo('0')).to.be.true;
			expect(invalidBlock2.totalAmount.isEqualTo('0')).to.be.true;
			expect(invalidBlock2.payloadLength).to.equal(0);
			expect(invalidBlock2.transactions).to.deep.equal([]);
			expect(invalidBlock2.previousBlock).to.equal(genesisBlock.id);
			done();
		});

		describe('normalizeBlock validations', () => {
			beforeEach(done => {
				const account = random.account();
				const transaction = transfer({
					amount: new Bignum(NORMALIZER).multipliedBy(1000).toString(),
					recipientId: accountFixtures.genesis.address,
					passphrase: account.passphrase,
				});

				block2 = createBlock(
					blocks,
					random.password(),
					33772882,
					[transaction],
					genesisBlock
				);
				done();
			});

			it('should fail when timestamp property is missing', async () => {
				block2 = blocksUtils.deleteBlockProperties(block2);
				delete block2.timestamp;

				try {
					await blocksProcess.processBlock(block2, blocks.lastBlock);
				} catch (errors) {
					expect(errors[0].message).equal(
						"should have required property 'timestamp'"
					);
				}
			});

			it('should fail when transactions property is missing', async () => {
				delete block2.transactions;
				try {
					await blocksProcess.processBlock(block2, blocks.lastBlock);
				} catch (errors) {
					expect(errors[0]).to.be.instanceOf(Error);
					expect(errors[0].message).equal('Invalid total fee');
				}
			});

			it('should fail when transaction type property is missing', async () => {
				const transactionType = block2.transactions[0].type;
				delete block2.transactions[0].type;
				try {
					await blocksProcess.processBlock(block2, blocks.lastBlock);
				} catch (err) {
					expect(err[0].message).equal(
						"'' should have required property 'type'"
					);
					expect(err[1].message).equal('Invalid type');
					block2.transactions[0].type = transactionType;
				}
			});

			it('should fail when transaction timestamp property is missing', async () => {
				const transactionTimestamp = block2.transactions[0].timestamp;
				delete block2.transactions[0].timestamp;
				try {
					await blocksProcess.processBlock(block2, blocks.lastBlock);
				} catch (err) {
					expect(err[0].message).equal(
						"'' should have required property 'timestamp'"
					);
					block2.transactions[0].timestamp = transactionTimestamp;
				}
			});

			it('should fail when block generator is invalid (fork:3)', async () => {
				try {
					await blocksProcess.processBlock(block2, blocks.lastBlock);
				} catch (err) {
					expect(err.message).equal('Failed to verify slot: 3377288');
				}
			});

			describe('block with processed transaction', () => {
				let auxBlock;

				it('should generate block 1 with valid generator slot and processed transaction', done => {
					const slot = slots.getSlotNumber();
					const time = slots.getSlotTime(slots.getSlotNumber());

					const account = random.account();
					const transferTransaction = transfer({
						amount: new Bignum(NORMALIZER).multipliedBy(1000).toString(),
						recipientId: accountFixtures.genesis.address,
						passphrase: account.passphrase,
					});

					getValidKeypairForSlot(library, slot)
						.then(passphrase => {
							auxBlock = createBlock(
								blocks,
								passphrase,
								time,
								[transferTransaction],
								genesisBlock
							);

							expect(auxBlock.version).to.equal(0);
							expect(auxBlock.timestamp).to.equal(time);
							expect(auxBlock.numberOfTransactions).to.equal(1);
							expect(auxBlock.reward.isEqualTo('0')).to.be.true;
							expect(auxBlock.totalFee.isEqualTo('10000000')).to.be.true;
							expect(auxBlock.totalAmount.isEqualTo('100000000000')).to.be.true;
							expect(auxBlock.payloadLength).to.equal(117);
							expect(
								auxBlock.transactions.map(transaction => transaction.id)
							).to.deep.equal(
								[transferTransaction].map(transaction => transaction.id)
							);
							expect(auxBlock.previousBlock).to.equal(genesisBlock.id);
							done();
						})
						.catch(err => {
							done(err);
						});
				});

				it('should fail when transaction is invalid', async () => {
					const account = random.account();
					const transaction = transfer({
						amount: new Bignum(NORMALIZER).multipliedBy(1000).toString(),
						recipientId: accountFixtures.genesis.address,
						passphrase: account.passphrase,
					});
					transaction.senderId = account.address;

					const createBlockPayload = (
						passPhrase,
						transactions,
						previousBlockArgs
					) => {
						const time = slots.getSlotTime(slots.getSlotNumber());
						const firstBlock = createBlock(
							blocks,
							passPhrase,
							time,
							transactions,
							previousBlockArgs
						);

						return blocksUtils.deleteBlockProperties(firstBlock);
					};

					const passPhrase = await getValidKeypairForSlot(
						library,
						slots.getSlotNumber()
					);
					const transactions = [transaction];
					const firstBlock = createBlockPayload(
						passPhrase,
						transactions,
						genesisBlock
					);
					try {
						await blocksProcess.processBlock(firstBlock, blocks.lastBlock);
					} catch (err) {
						expect(err[0].message).to.equal(
							`Account does not have enough LSK: ${account.address}, balance: 0`
						);
					}
				});

				it('should fail when transaction is already confirmed (fork:2)', async () => {
					const account = random.account();
					const transaction = transfer({
						amount: new Bignum(NORMALIZER).multipliedBy(1000).toString(),
						passphrase: accountFixtures.genesis.passphrase,
						recipientId: account.address,
					});
					transaction.senderId = '16313739661670634666L';

					const createBlockPayload = (
						passPhrase,
						transactions,
						previousBlockArgs
					) => {
						const time = slots.getSlotTime(slots.getSlotNumber());
						const firstBlock = createBlock(
							blocks,
							passPhrase,
							time,
							transactions,
							previousBlockArgs
						);

						return blocksUtils.deleteBlockProperties(firstBlock);
					};

					const passPhrase = await getValidKeypairForSlot(
						library,
						slots.getSlotNumber()
					);
					const transactions = [transaction];
					const firstBlock = createBlockPayload(
						passPhrase,
						transactions,
						genesisBlock
					);
					await blocksProcess.processBlock(firstBlock, blocks.lastBlock);
					await new Promise(resolve => {
						setTimeout(resolve, 10000);
					});
					const resultedPassPhrase = await getValidKeypairForSlot(
						library,
						slots.getSlotNumber()
					);
					const secondBlock = createBlockPayload(
						resultedPassPhrase,
						transactions,
						firstBlock
					);
					try {
						await blocksProcess.processBlock(secondBlock, blocks.lastBlock);
					} catch (processBlockErr) {
						expect(processBlockErr).to.be.instanceOf(Error);
						expect(processBlockErr.message).to.equal(
							['Transaction is already confirmed:', transaction.id].join(' ')
						);
					}
				});
			});
		});
	});

	describe('processBlock for valid block {broadcast: false, saveBlock: true}', () => {
		it('should generate block 2 with valid generator slot', done => {
			const slot = slots.getSlotNumber();
			const time = slots.getSlotTime(slots.getSlotNumber());

			getValidKeypairForSlot(library, slot)
				.then(passphrase => {
					block2 = createBlock(blocks, passphrase, time, [], genesisBlock);
					expect(block2.version).to.equal(0);
					expect(block2.timestamp).to.equal(time);
					expect(block2.numberOfTransactions).to.equal(0);
					expect(block2.reward.isEqualTo('0')).to.be.true;
					expect(block2.totalFee.isEqualTo('0')).to.be.true;
					expect(block2.totalAmount.isEqualTo('0')).to.be.true;
					expect(block2.payloadLength).to.equal(0);
					expect(block2.transactions).to.deep.equal([]);
					expect(block2.previousBlock).to.equal(genesisBlock.id);
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('should be ok when processing block 2', async () => {
			await blocksProcess.processBlock(block2, blocks.lastBlock);
		});
	});
});
