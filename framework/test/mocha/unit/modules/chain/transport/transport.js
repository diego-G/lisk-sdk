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

const chai = require('chai');
const {
	Status: TransactionStatus,
	TransferTransaction,
} = require('@liskhq/lisk-transactions');
const BigNum = require('@liskhq/bignum');
const { transfer, TransactionError } = require('@liskhq/lisk-transactions');
const { validator } = require('@liskhq/lisk-validator');
const accountFixtures = require('../../../../fixtures/accounts');
const { Block, GenesisBlock } = require('../../../../fixtures/blocks');
const {
	registeredTransactions,
} = require('../../../../common/registered_transactions');
const transactionsModule = require('../../../../../../src/modules/chain/transactions');
const {
	TransactionInterfaceAdapter,
} = require('../../../../../../src/modules/chain/interface_adapters');
const blocksModule = require('../../../../../../src/modules/chain/blocks');
const definitions = require('../../../../../../src/modules/chain/schema/definitions');
const {
	Transport: TransportModule,
} = require('../../../../../../src/modules/chain/transport');
const jobsQueue = require('../../../../../../src/modules/chain/utils/jobs_queue');

const expect = chai.expect;

describe('transport', () => {
	const interfaceAdapters = {
		transactions: new TransactionInterfaceAdapter(registeredTransactions),
	};
	const { MAX_SHARED_TRANSACTIONS } = __testContext.config.constants;

	let storageStub;
	let loggerStub;
	let channelStub;
	let transportModule;
	let transaction;
	let block;
	let blocksList;
	let transactionsList;
	let multisignatureTransactionsList;
	let blockMock;
	let error;

	const SAMPLE_SIGNATURE_1 = {
		transactionId: '222675625422353767',
		publicKey:
			'2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
		signature:
			'32636139613731343366633732316664633534306665663839336232376538643634386432323838656661363165353632363465646630316132633233303739',
	};

	const SAMPLE_SIGNATURE_2 = {
		transactionId: '222675625422353768',
		publicKey:
			'3ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23080',
		signature:
			'61383939393932343233383933613237653864363438643232383865666136316535363236346564663031613263323330373784192003750382840553137595',
	};

	beforeEach(async () => {
		// Recreate all the stubs and default structures before each test case to make
		// sure that they are fresh every time; that way each test case can modify
		// stubs without affecting other test cases.

		transaction = transfer({
			amount: '100',
			recipientId: '12668885769632475474L',
			passphrase: accountFixtures.genesis.passphrase,
		});
		const transactionOne = transfer({
			amount: '100',
			recipientId: '12668885769632475474L',
			passphrase: accountFixtures.genesis.passphrase,
		});
		const transactionTwo = transfer({
			amount: '100',
			recipientId: '12668885769632475474L',
			passphrase: accountFixtures.genesis.passphrase,
		});

		blockMock = new Block();

		transactionsList = [transactionOne, transactionTwo];

		multisignatureTransactionsList = [
			{
				id: '222675625422353767',
				type: 0,
				amount: '100',
				fee: '10',
				senderPublicKey:
					'2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
				recipientId: '12668885769632475474L',
				timestamp: 28227090,
				asset: {},
				signatures: [
					'2821d93a742c4edf5fd960efad41a4def7bf0fd0f7c09869aed524f6f52bf9c97a617095e2c712bd28b4279078a29509b339ac55187854006591aa759784c205',
				],
			},
			{
				id: '332675625422353892',
				type: 0,
				amount: '1000',
				fee: '10',
				senderPublicKey:
					'2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
				recipientId: '12668885769632475474L',
				timestamp: 28227090,
				asset: {},
				signatures: [
					'1231d93a742c4edf5fd960efad41a4def7bf0fd0f7c09869aed524f6f52bf9c97a617095e2c712bd28b4279078a29509b339ac55187854006591aa759784c567',
					'2821d93a742c4edf5fd960efad41a4def7bf0fd0f7c09869aed524f6f52bf9c97a617095e2c712bd28b4279078a29509b339ac55187854006591aa759784c205',
				],
			},
		];

		storageStub = {
			query: sinonSandbox.spy(),
			get: sinonSandbox.stub(),
			entities: {
				Block: {
					get: sinonSandbox.stub().resolves(),
				},
			},
		};

		loggerStub = {
			debug: sinonSandbox.spy(),
			error: sinonSandbox.stub(),
			info: sinonSandbox.spy(),
			trace: sinonSandbox.spy(),
		};

		channelStub = {
			publish: sinonSandbox.stub(),
			invoke: sinonSandbox.stub(),
		};

		sinonSandbox.stub(jobsQueue, 'register');

		transportModule = new TransportModule({
			channel: channelStub,
			logger: loggerStub,
			storage: storageStub,
			applicationState: {},
			exceptions: __testContext.config.modules.chain.exceptions,
			transactionPoolModule: {
				getMultisignatureTransactionList: sinonSandbox.stub(),
				getMergedTransactionList: sinonSandbox.stub(),
				getTransactionAndProcessSignature: sinonSandbox.stub(),
				processUnconfirmedTransaction: sinonSandbox.stub(),
			},
			blocksModule: {
				lastBlock: sinonSandbox
					.stub()
					.returns({ height: 1, version: 1, timestamp: 1 }),
				receiveBlockFromNetwork: sinonSandbox.stub(),
				loadBlocksFromLastBlockId: sinonSandbox.stub(),
			},
			processorModule: {
				validate: sinonSandbox.stub(),
				process: sinonSandbox.stub(),
				deserialize: sinonSandbox.stub(),
			},
			loaderModule: {
				syncing: sinonSandbox.stub().returns(false),
			},
			interfaceAdapters,
			nonce: __testContext.config.app.nonce,
			broadcasts: __testContext.config.modules.chain.broadcasts,
			maxSharedTransactions:
				__testContext.config.constants.MAX_SHARED_TRANSACTIONS,
		});
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	describe('constructor', () => {
		describe('transportModule', () => {
			it('should assign scope variables when instantiating', async () => {
				expect(transportModule)
					.to.have.property('storage')
					.which.is.equal(storageStub);
				expect(transportModule)
					.to.have.property('logger')
					.which.is.equal(loggerStub);
				expect(transportModule)
					.to.have.property('channel')
					.which.is.equal(channelStub);
				expect(transportModule).to.have.property('broadcaster');
			});
		});
	});

	describe('private', () => {
		describe('receiveSignatures', () => {
			describe('for every signature in signatures', () => {
				describe('when transportModule._receiveSignature succeeds', () => {
					beforeEach(async () => {
						transportModule._receiveSignature = sinonSandbox.stub().callsArg(1);
						transportModule._receiveSignatures([
							SAMPLE_SIGNATURE_1,
							SAMPLE_SIGNATURE_2,
						]);
					});

					it('should call receiveSignature with signature', async () => {
						expect(transportModule._receiveSignature.calledTwice).to.be.true;
						expect(
							transportModule._receiveSignature.calledWith(SAMPLE_SIGNATURE_1),
						).to.be.true;
						return expect(
							transportModule._receiveSignature.calledWith(SAMPLE_SIGNATURE_2),
						).to.be.true;
					});
				});

				describe('when receiveSignature fails', () => {
					let receiveSignatureError;

					beforeEach(async () => {
						receiveSignatureError = new Error(
							'Error processing signature: Error message',
						);
						transportModule._receiveSignature = sinonSandbox
							.stub()
							.rejects(receiveSignatureError);

						await transportModule._receiveSignatures([
							SAMPLE_SIGNATURE_1,
							SAMPLE_SIGNATURE_2,
						]);
					});

					it('should call transportModule.logger.debug with err and signature', async () => {
						// If any of the transportModule._receiveSignature calls fail, the rest of
						// the batch should still be processed.
						expect(transportModule._receiveSignature.calledTwice).to.be.true;
						expect(
							transportModule.logger.debug.calledWith(
								receiveSignatureError,
								SAMPLE_SIGNATURE_1,
							),
						).to.be.true;
						return expect(
							transportModule.logger.debug.calledWith(
								receiveSignatureError,
								SAMPLE_SIGNATURE_2,
							),
						).to.be.true;
					});
				});
			});
		});

		describe('receiveSignature', () => {
			beforeEach(async () => {
				transportModule.transactionPoolModule.getTransactionAndProcessSignature.resolves();
				sinonSandbox.spy(validator, 'validate');
			});

			describe('when validator.validate succeeds', () => {
				describe('when modules.transactionPool.getTransactionAndProcessSignature succeeds', () => {
					beforeEach(async () => {
						transportModule.transactionPoolModule.getTransactionAndProcessSignature.resolves();
						return transportModule._receiveSignature(SAMPLE_SIGNATURE_1);
					});

					it('should call validator.validate with signature', async () => {
						expect(validator.validate.calledOnce).to.be.true;
						return expect(
							validator.validate.calledWith(
								definitions.Signature,
								SAMPLE_SIGNATURE_1,
							),
						).to.be.true;
					});

					it('should call modules.transactionPool.getTransactionAndProcessSignature with signature', async () => {
						return expect(
							transportModule.transactionPoolModule
								.getTransactionAndProcessSignature,
						).to.be.calledWith(SAMPLE_SIGNATURE_1);
					});
				});

				describe('when modules.transactionPool.getTransactionAndProcessSignature fails', () => {
					const processSignatureError = new TransactionError(
						'Transaction not found',
					);

					it('should reject with error', async () => {
						transportModule.transactionPoolModule.getTransactionAndProcessSignature.rejects(
							[processSignatureError],
						);

						return expect(
							transportModule._receiveSignature(SAMPLE_SIGNATURE_1),
						).to.be.rejectedWith([processSignatureError]);
					});
				});
			});

			describe('when validator.validate fails', () => {
				it('should reject with error = "Invalid signature body"', async () => {
					try {
						await transportModule._receiveSignature(SAMPLE_SIGNATURE_1);
					} catch (e) {
						expect(e.message).to.equal('Invalid signture body');
					}
				});
			});
		});

		describe('receiveTransactions', () => {
			beforeEach(async () => {
				transportModule.logger = {
					debug: sinonSandbox.spy(),
				};

				transportModule._receiveTransaction = sinonSandbox.stub().callsArg(1);
			});

			describe('when transactions argument is undefined', () => {
				beforeEach(async () => {
					transportModule._receiveTransactions(undefined);
				});

				// If a single transaction within the batch fails, it is not going to
				// send back an error.
				it('should should not call transportModule._receiveTransaction', async () =>
					expect(transportModule._receiveTransaction.notCalled).to.be.true);
			});

			describe('for every transaction in transactions', () => {
				describe('when transaction is defined', () => {
					describe('when call transportModule._receiveTransaction succeeds', () => {
						beforeEach(async () => {
							transportModule._receiveTransactions(transactionsList);
						});

						it('should set transaction.bundled = true', async () =>
							expect(transactionsList[0])
								.to.have.property('bundled')
								.which.equals(true));

						it('should call transportModule._receiveTransaction with transaction with transaction argument', async () =>
							expect(
								transportModule._receiveTransaction.calledWith(
									transactionsList[0],
								),
							).to.be.true);
					});

					describe('when call transportModule._receiveTransaction fails', () => {
						let receiveTransactionError;

						beforeEach(async () => {
							receiveTransactionError = 'Invalid transaction body - ...';
							transportModule._receiveTransaction = sinonSandbox
								.stub()
								.rejects(receiveTransactionError);

							return transportModule._receiveTransactions(transactionsList);
						});

						it('should call transportModule.logger.debug with error and transaction', async () =>
							expect(
								transportModule.logger.debug.calledWith(
									receiveTransactionError,
									transactionsList[0],
								),
							).to.be.true);
					});
				});
			});
		});

		describe('receiveTransaction', () => {
			beforeEach(async () => {
				transportModule.transactionPoolModule.processUnconfirmedTransaction.resolves();
			});

			afterEach(() => sinonSandbox.restore());

			it('should composeProcessTransactionsSteps with checkAllowedTransactions and validateTransactions', async () => {
				sinonSandbox.spy(transactionsModule, 'composeTransactionSteps');
				await transportModule._receiveTransaction(transaction);
				return expect(transactionsModule.composeTransactionSteps).to.be
					.calledOnce;
			});

			it('should call composedTransactionsCheck an array of transactions', async () => {
				const composedTransactionsCheck = sinonSandbox.stub().returns({
					transactionsResponses: [
						{
							id: transaction.id,
							status: TransactionStatus.OK,
							errors: [],
						},
					],
				});

				const tranasactionInstance = interfaceAdapters.transactions.fromJson(
					transaction,
				);

				sinonSandbox
					.stub(transactionsModule, 'composeTransactionSteps')
					.returns(composedTransactionsCheck);

				await transportModule._receiveTransaction(transaction);
				return expect(composedTransactionsCheck).to.have.been.calledWith([
					tranasactionInstance,
				]);
			});

			it('should reject with error if transaction is not allowed', async () => {
				const errorMessage = new Error(
					'Transaction type 0 is currently not allowed.',
				);

				sinonSandbox
					.stub(interfaceAdapters.transactions, 'fromJson')
					.returns({ ...transaction, matcher: () => false });

				return expect(
					transportModule._receiveTransaction(transaction),
				).to.be.rejectedWith([errorMessage]);
			});

			describe('when transaction and peer are defined', () => {
				beforeEach(async () => {
					await transportModule._receiveTransaction(transaction);
				});

				it('should call modules.transactionPool.processUnconfirmedTransaction with transaction and true as arguments', async () =>
					expect(
						transportModule.transactionPoolModule.processUnconfirmedTransaction.calledWith(
							interfaceAdapters.transactions.fromJson(transaction),
							true,
						),
					).to.be.true);
			});

			describe('when transaction is invalid', () => {
				let invalidTransaction;
				let errorResult;

				beforeEach(async () => {
					invalidTransaction = {
						...transaction,
						asset: {},
					};

					try {
						await transportModule._receiveTransaction(invalidTransaction);
					} catch (err) {
						errorResult = err;
					}
				});

				it('should call the call back with error message', async () => {
					interfaceAdapters.transactions
						.fromJson(invalidTransaction)
						.validate();
					expect(errorResult).to.be.an('array');
					errorResult.forEach(anError => {
						expect(anError).to.be.instanceOf(TransactionError);
					});
				});
			});

			describe('when modules.transactions.processUnconfirmedTransaction fails', () => {
				let processUnconfirmedTransactionError;

				beforeEach(async () => {
					processUnconfirmedTransactionError = `Transaction is already processed: ${
						transaction.id
					}`;

					transportModule.transactionPoolModule.processUnconfirmedTransaction.rejects(
						[new Error(processUnconfirmedTransactionError)],
					);

					try {
						await transportModule._receiveTransaction(transaction);
					} catch (err) {
						error = err;
					}
				});

				it('should call transportModule.logger.debug with "Transaction ${transaction.id}" and error string', async () => {
					expect(transportModule.logger.debug).to.be.calledWith(
						`Transaction ${transaction.id}`,
						`Error: ${processUnconfirmedTransactionError}`,
					);
				});

				describe('when transaction is defined', () => {
					it('should call transportModule.logger.debug with "Transaction" and transaction as arguments', async () => {
						expect(transportModule.logger.debug).to.be.calledWith(
							{
								transaction: interfaceAdapters.transactions.fromJson(
									transaction,
								),
							},
							'Transaction',
						);
					});
				});

				it('should reject with error', async () => {
					expect(error).to.be.an('array');
					expect(error[0].message).to.equal(processUnconfirmedTransactionError);
				});
			});

			describe('when modules.transactions.processUnconfirmedTransaction succeeds', () => {
				let result;

				beforeEach(async () => {
					result = await transportModule._receiveTransaction(transaction);
				});

				it('should resolve with result = transaction.id', async () =>
					expect(result).to.equal(transaction.id));

				it('should call transportModule.logger.debug with "Received transaction " + transaction.id', async () =>
					expect(
						transportModule.logger.debug.calledWith(
							{ id: transaction.id },
							'Received transaction',
						),
					).to.be.true);
			});
		});

		describe('Transport', () => {
			beforeEach(async () => {
				blocksList = [];
				for (let j = 0; j < 10; j++) {
					const auxBlock = new Block();
					blocksList.push(auxBlock);
				}
				sinonSandbox
					.stub(blocksModule, 'addBlockProperties')
					.returns(blockMock);
			});

			describe('onSignature', () => {
				describe('when broadcast is defined', () => {
					beforeEach(async () => {
						transportModule.broadcaster = {
							enqueue: sinonSandbox.stub(),
						};
						transportModule.onSignature(SAMPLE_SIGNATURE_1, true);
					});

					it('should call transportModule.broadcaster.enqueue with signature', () => {
						expect(transportModule.broadcaster.enqueue.calledOnce).to.be.true;
						return expect(
							transportModule.broadcaster.enqueue.calledWith(
								{},
								{
									api: 'postSignatures',
									data: { signature: SAMPLE_SIGNATURE_1 },
								},
							),
						).to.be.true;
					});

					it('should call transportModule.broadcaster.enqueue with {} and {api: "postSignatures", data: {signature: signature}} as arguments', async () => {
						expect(transportModule.broadcaster.enqueue.calledOnce).to.be.true;
						return expect(
							transportModule.broadcaster.enqueue.calledWith(
								{},
								{
									api: 'postSignatures',
									data: { signature: SAMPLE_SIGNATURE_1 },
								},
							),
						).to.be.true;
					});

					it('should call transportModule.channel.publish with "chain:signature:change" and signature', async () => {
						expect(transportModule.channel.publish).to.be.calledOnce;
						expect(transportModule.channel.publish).to.be.calledWith(
							'chain:signature:change',
							SAMPLE_SIGNATURE_1,
						);
					});
				});
			});

			describe('onUnconfirmedTransaction', () => {
				beforeEach(async () => {
					transaction = new TransferTransaction({
						id: '222675625422353767',
						type: 0,
						amount: '100',
						fee: '10',
						senderPublicKey:
							'2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
						recipientId: '12668885769632475474L',
						timestamp: 28227090,
						asset: {},
						signature:
							'2821d93a742c4edf5fd960efad41a4def7bf0fd0f7c09869aed524f6f52bf9c97a617095e2c712bd28b4279078a29509b339ac55187854006591aa759784c205',
					});
					transportModule.broadcaster = {
						enqueue: sinonSandbox.stub(),
					};
					transportModule.channel = {
						invoke: sinonSandbox.stub(),
						publish: sinonSandbox.stub(),
					};
					transportModule.onUnconfirmedTransaction(transaction, true);
				});

				describe('when broadcast is defined', () => {
					beforeEach(async () => {
						transportModule.broadcaster = {
							enqueue: sinonSandbox.stub(),
						};
						transportModule.channel = {
							invoke: sinonSandbox.stub(),
							publish: sinonSandbox.stub(),
						};
						transportModule.onUnconfirmedTransaction(transaction, true);
					});

					it('should call transportModule.broadcaster.enqueue with {} and {api: "postTransactions", data: {transaction}}', async () => {
						expect(transportModule.broadcaster.enqueue.calledOnce).to.be.true;
						return expect(
							transportModule.broadcaster.enqueue.calledWith(
								{},
								{
									api: 'postTransactions',
									data: { transaction: transaction.toJSON() },
								},
							),
						).to.be.true;
					});

					it('should call transportModule.channel.publish with "chain:transactions:change" and transaction as arguments', async () => {
						expect(transportModule.channel.publish).to.be.calledOnce;
						expect(transportModule.channel.publish).to.be.calledWith(
							'chain:transactions:change',
							transaction.toJSON(),
						);
					});
				});
			});

			describe('onBroadcastBlock', () => {
				describe('when broadcast is defined', () => {
					beforeEach(async () => {
						block = {
							id: '6258354802676165798',
							height: 123,
							timestamp: 28227090,
							generatorPublicKey:
								'968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b',
							numberOfTransactions: 15,
							totalAmount: new BigNum('150000000'),
							totalFee: new BigNum('15000000'),
							reward: new BigNum('50000000'),
							totalForged: '65000000',
						};
						transportModule.broadcaster = {
							enqueue: sinonSandbox.stub(),
							broadcast: sinonSandbox.stub(),
						};
						return transportModule.onBroadcastBlock(block, true);
					});

					it('should call transportModule.broadcaster.broadcast', () => {
						expect(transportModule.broadcaster.broadcast.calledOnce).to.be.true;
						return expect(
							transportModule.broadcaster.broadcast,
						).to.be.calledWith({
							api: 'postBlock',
							data: {
								block,
							},
						});
					});

					describe('when modules.loader.syncing = true', () => {
						beforeEach(async () => {
							transportModule.loaderModule.syncing = sinonSandbox
								.stub()
								.returns(true);
							transportModule.onBroadcastBlock(block, true);
						});

						it('should call transportModule.logger.debug with proper error message', () => {
							return expect(
								transportModule.logger.debug.calledWith(
									'Transport->onBroadcastBlock: Aborted - blockchain synchronization in progress',
								),
							).to.be.true;
						});
					});
				});
			});

			describe('Transport.prototype.shared', () => {
				let result;
				let query = { ids: ['1', '2', '3'] };

				describe('getBlocksFromId', () => {
					describe('when query is undefined', () => {
						it('should throw a validation error', async () => {
							query = {};

							try {
								await transportModule.getBlocksFromId(query);
							} catch (e) {
								expect(e[0].message).to.equal(
									"should have required property 'blockId'",
								);
							}
						});
					});

					describe('when query is defined', () => {
						it('should call modules.blocks.loadBlocksFromLastBlockId with lastBlockId and limit 34', async () => {
							query = {
								blockId: '6258354802676165798',
							};

							await transportModule.getBlocksFromId(query);
							return expect(
								transportModule.blocksModule.loadBlocksFromLastBlockId,
							).to.be.calledWith(query.blockId, 34);
						});
					});

					describe('when modules.blocks.loadBlocksFromLastBlockId fails', () => {
						it('should throw an error', async () => {
							query = {
								blockId: '6258354802676165798',
							};

							const errorMessage = 'Failed to load blocks...';
							const loadBlockFailed = new Error(errorMessage);

							transportModule.blocksModule.loadBlocksFromLastBlockId.rejects(
								loadBlockFailed,
							);

							try {
								await transportModule.getBlocksFromId(query);
							} catch (e) {
								expect(e.message).to.equal(errorMessage);
							}
						});
					});
				});

				describe('postBlock', () => {
					let postBlockQuery;

					beforeEach(async () => {
						postBlockQuery = {
							block: blockMock,
						};
						sinonSandbox.spy(validator, 'validate');
					});

					describe('when transportModule.config.broadcasts.active option is false', () => {
						beforeEach(async () => {
							transportModule.constants.broadcasts.active = false;
							await transportModule.postBlock(postBlockQuery);
						});

						it('should call transportModule.logger.debug', async () =>
							expect(
								transportModule.logger.debug.calledWith(
									'Receiving blocks disabled by user through config.json',
								),
							).to.be.true);

						it('should not call validator.validate; function should return before', async () =>
							expect(validator.validate.called).to.be.false);
					});

					describe('when query is specified', () => {
						beforeEach(async () => {
							transportModule.constants.broadcasts.active = true;
						});

						describe('when it throws', () => {
							const blockValidationError = 'should match format "id"';

							it('should throw an error', async () => {
								try {
									await transportModule.postBlock(postBlockQuery);
								} catch (err) {
									expect(err[0].message).to.equal(blockValidationError);
								}
							});
						});

						describe('when it does not throw', () => {
							const genesisBlock = new GenesisBlock();
							genesisBlock.previousBlockId = genesisBlock.id; // So validations pass

							describe('when query.block is defined', () => {
								it('should call modules.blocks.addBlockProperties with query.block', async () => {
									await transportModule.postBlock({
										block: genesisBlock,
									});
									expect(
										transportModule.processorModule.deserialize.calledWith(
											genesisBlock,
										),
									).to.be.true;
								});
							});

							it('should call transportModule.processorModule.process with block', async () => {
								const blockWithProperties = {};
								transportModule.processorModule.deserialize.resolves(
									blockWithProperties,
								);
								await transportModule.postBlock({
									block: genesisBlock,
								});
								expect(
									transportModule.processorModule.process,
								).to.be.calledWithExactly(blockWithProperties);
							});
						});
					});
				});

				describe('postSignature', () => {
					describe('when getTransactionAndProcessSignature succeeds', () => {
						it('should invoke resolve with object { success: true }', async () => {
							query = {
								signature: SAMPLE_SIGNATURE_1,
							};
							transportModule.transactionPoolModule.getTransactionAndProcessSignature.resolves();
							result = await transportModule.postSignature(query);
							return expect(result)
								.to.have.property('success')
								.which.is.equal(true);
						});
					});

					describe('when getTransactionAndProcessSignature fails', () => {
						const receiveSignatureError = [
							new Error('Invalid signature body ...'),
						];

						it('should invoke resolve with object { success: false, message: err }', async () => {
							query = {
								signature: SAMPLE_SIGNATURE_1,
							};
							transportModule.transactionPoolModule.getTransactionAndProcessSignature.rejects(
								receiveSignatureError,
							);
							result = await transportModule.postSignature(query);
							expect(result)
								.to.have.property('success')
								.which.is.equal(false);
							return expect(result)
								.to.have.property('errors')
								.which.is.equal(receiveSignatureError);
						});
					});
				});

				describe('postSignatures', () => {
					beforeEach(async () => {
						query = {
							signatures: [SAMPLE_SIGNATURE_1],
						};
						transportModule._receiveSignatures = sinonSandbox.stub();
					});

					describe('when transportModule.config.broadcasts.active option is false', () => {
						beforeEach(async () => {
							transportModule.constants.broadcasts.active = false;
							transportModule.postSignatures(query);
							sinonSandbox.spy(validator, 'validate');
						});

						it('should call transportModule.logger.debug', async () =>
							expect(
								transportModule.logger.debug.calledWith(
									'Receiving signatures disabled by user through config.json',
								),
							).to.be.true);

						it('should not call validator.validate; function should return before', async () =>
							expect(validator.validate.called).to.be.false);
					});

					describe('when validator.validate succeeds', () => {
						beforeEach(async () => {
							transportModule.constants.broadcasts.active = true;
							return transportModule.postSignatures(query);
						});

						it('should call transportModule._receiveSignatures with query.signatures as argument', async () =>
							expect(
								transportModule._receiveSignatures.calledWith(query.signatures),
							).to.be.true);
					});
					describe('when validator.validate fails', () => {
						let validateErr;

						it('should call transportModule.logger.debug with "Invalid signatures body" and err as arguments', async () => {
							validateErr = new Error('Transaction query did not match schema');
							validateErr.code = 'INVALID_FORMAT';
							validator.validate = sinonSandbox.stub().returns([validateErr]);

							expect(transportModule.postSignatures(query)).to.be.rejectedWith([
								validateErr,
							]);

							return expect(transportModule.logger.debug).to.be.calledWithMatch(
								{},
								'Invalid signatures body',
							);
						});
					});
				});

				describe('getSignatures', () => {
					beforeEach(async () => {
						transportModule.transactionPoolModule.getMultisignatureTransactionList = sinonSandbox
							.stub()
							.returns(multisignatureTransactionsList);

						result = await transportModule.getSignatures();
					});

					it('should call modules.transactionPool.getMultisignatureTransactionList with true and MAX_SHARED_TRANSACTIONS', async () => {
						expect(
							transportModule.transactionPoolModule
								.getMultisignatureTransactionList,
						).calledWith(true, MAX_SHARED_TRANSACTIONS);
					});

					describe('when all transactions returned by modules.transactionPool.getMultisignatureTransactionList are multisignature transactions', () => {
						it('should resolve with result = {success: true, signatures: signatures} where signatures contains all transactions', async () => {
							expect(result)
								.to.have.property('success')
								.which.equals(true);
							return expect(result)
								.to.have.property('signatures')
								.which.is.an('array')
								.that.has.property('length')
								.which.equals(2);
						});
					});

					describe('when some transactions returned by modules.transactionPool.getMultisignatureTransactionList are multisignature registration transactions', () => {
						beforeEach(async () => {
							// Make it so that the first transaction in the list is a multisignature registration transaction.
							multisignatureTransactionsList[0] = {
								id: '222675625422353767',
								type: 4,
								amount: '150000000',
								fee: '1000000',
								senderPublicKey:
									'2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
								recipientId: '12668885769632475474L',
								timestamp: 28227090,
								asset: {},
								signature:
									'2821d93a742c4edf5fd960efad41a4def7bf0fd0f7c09869aed524f6f52bf9c97a617095e2c712bd28b4279078a29509b339ac55187854006591aa759784c205',
							};

							transportModule.transactionPoolModule.getMultisignatureTransactionList = sinonSandbox
								.stub()
								.returns(multisignatureTransactionsList);

							result = await transportModule.getSignatures();
						});

						it('should resolve with result = {success: true, signatures: signatures} where signatures does not contain multisignature registration transactions', async () => {
							expect(result)
								.to.have.property('success')
								.which.equals(true);
							return expect(result)
								.to.have.property('signatures')
								.which.is.an('array')
								.that.has.property('length')
								.which.equals(1);
						});
					});
				});

				describe('getTransactions', () => {
					beforeEach(async () => {
						transportModule.transactionPoolModule.getMergedTransactionList.returns(
							multisignatureTransactionsList,
						);
						result = await transportModule.getTransactions();
					});

					it('should call modules.transactionPool.getMergedTransactionList with true and MAX_SHARED_TRANSACTIONS', async () => {
						expect(
							transportModule.transactionPoolModule.getMergedTransactionList,
						).calledWith(true, MAX_SHARED_TRANSACTIONS);
					});

					it('should resolve with result = {success: true, transactions: transactions}', async () => {
						expect(result)
							.to.have.property('success')
							.which.is.equal(true);
						return expect(result)
							.to.have.property('transactions')
							.which.is.an('array')
							.that.has.property('length')
							.which.equals(2);
					});
				});

				describe('postTransaction', () => {
					beforeEach(async () => {
						query = {
							transaction,
						};

						transportModule._receiveTransaction = sinonSandbox
							.stub()
							.resolves(transaction.id);

						result = await transportModule.postTransaction(query);
					});

					it('should call transportModule._receiveTransaction with query.transaction as argument', async () =>
						expect(
							transportModule._receiveTransaction.calledWith(query.transaction),
						).to.be.true);

					describe('when transportModule._receiveTransaction succeeds', () => {
						it('should resolve with object { success: true, transactionId: id }', async () => {
							expect(result)
								.to.have.property('transactionId')
								.which.is.a('string');
							return expect(result)
								.to.have.property('success')
								.which.is.equal(true);
						});
					});

					describe('when transportModule._receiveTransaction fails', () => {
						const receiveTransactionError = new Error(
							'Invalid transaction body ...',
						);

						beforeEach(async () => {
							transportModule._receiveTransaction = sinonSandbox
								.stub()
								.rejects(receiveTransactionError);

							result = await transportModule.postTransaction(query);
						});

						it('should resolve with object { success: false, message: err }', async () => {
							expect(result)
								.to.have.property('success')
								.which.is.equal(false);
							return expect(result)
								.to.have.property('errors')
								.which.is.equal(receiveTransactionError);
						});
					});

					describe('when transportModule._receiveTransaction fails with "Transaction pool is full"', () => {
						const receiveTransactionError = new Error(
							'Transaction pool is full',
						);

						beforeEach(async () => {
							transportModule._receiveTransaction = sinonSandbox
								.stub()
								.rejects(receiveTransactionError);

							result = await transportModule.postTransaction(query);
						});

						it('should resolve with object { success: false, message: err }', async () => {
							expect(result)
								.to.have.property('success')
								.which.is.equal(false);
							return expect(result)
								.to.have.property('errors')
								.which.is.equal(receiveTransactionError);
						});
					});
				});

				describe('postTransactions', () => {
					describe('when transportModule.config.broadcasts.active option is false', () => {
						beforeEach(async () => {
							transportModule.constants.broadcasts.active = false;
						});

						it('should call transportModule.logger.debug', async () => {
							await transportModule.postTransactions(query);
							expect(
								transportModule.logger.debug.calledWith(
									'Receiving transactions disabled by user through config.json',
								),
							).to.be.true;
						});

						it('should not call validator.validate; function should return before', async () => {
							await transportModule.postTransactions(query);
							expect(validator.validate).to.be.called;
						});
					});

					describe('when validator.validate succeeds', () => {
						beforeEach(async () => {
							query = {
								transactions: transactionsList,
							};
							transportModule.constants.broadcasts.active = true;
							transportModule._receiveTransactions = sinonSandbox.stub();
						});

						it('should call transportModule._receiveTransactions with query.transaction as argument', async () => {
							validator.validate.returns(true);
							await transportModule.postTransactions(query);
							expect(
								transportModule._receiveTransactions.calledWith(
									query.transactions,
								),
							).to.be.true;
						});
					});

					describe('when validator.validate fails', () => {
						it('should resolve with error = null and result = {success: false, message: message}', async () => {
							const validateErr = new Error(
								'Transaction query did not match schema',
							);
							validateErr.code = 'INVALID_FORMAT';
							validator.validate = sinonSandbox.stub().returns([validateErr]);

							return expect(
								transportModule.postTransactions(query),
							).to.be.rejectedWith([validateErr]);
						});
					});
				});
			});
		});
	});
});
