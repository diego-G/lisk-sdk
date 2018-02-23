/* eslint-disable mocha/no-pending-tests, mocha/no-skipped-tests */
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

var rewire = require('rewire');

var BlocksChain = rewire('../../../../modules/blocks/chain.js');

describe('blocks/chain', () => {
	var __private;
	var library;
	var modules;
	var blocksChainModule;
	var dbStub;
	var loggerStub;
	var blockStub;
	var transactionStub;
	var busStub;
	var balancesSequenceStub;
	var genesisblockStub;
	var modulesStub;

	beforeEach(() => {
		// Logic

		dbStub = {
			blocks: {
				getGenesisBlockId: sinonSandbox.stub(),
				deleteBlock: sinonSandbox.stub(),
				deleteAfterBlock: sinonSandbox.stub(),
			},
			tx: sinonSandbox.stub(),
		};
		blockStub = sinonSandbox.stub();
		loggerStub = {
			trace: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
		};
		busStub = {
			message: sinonSandbox.stub(),
		};
		transactionStub = {
			afterSave: sinonSandbox.stub().callsArgWith(1, null, true),
			undoUnconfirmed: sinonSandbox.stub(),
		};
		balancesSequenceStub = {
			add: (cb, cbp) => {
				cb(cbp);
			},
		};
		genesisblockStub = {
			block: {
				id: '6524861224470851795',
				height: 1,
			},
		};
		blocksChainModule = new BlocksChain(
			loggerStub,
			blockStub,
			transactionStub,
			dbStub,
			genesisblockStub,
			busStub,
			balancesSequenceStub
		);

		library = BlocksChain.__get__('library');
		__private = BlocksChain.__get__('__private');
		// Module
		const tracker = {
			applyNext: sinonSandbox.stub(),
		};
		var modulesAccountsStub = {
			getAccount: sinonSandbox.stub(),
			setAccountAndGet: sinonSandbox.stub(),
		};
		var modulesBlocksStub = {
			lastBlock: {
				get: sinonSandbox.stub(),
				set: sinonSandbox.stub(),
			},
			utils: {
				loadBlocksPart: sinonSandbox.stub(),
				getBlockProgressLogger: sinonSandbox.stub().returns(tracker),
			},
			isActive: {
				set: sinonSandbox.stub(),
			},
		};
		var modulesRoundsStub = {
			backwardTick: sinonSandbox.stub(),
			tick: sinonSandbox.stub(),
		};
		var modulesTransactionsStub = {
			applyUnconfirmed: sinonSandbox.stub(),
			apply: sinonSandbox.stub(),
			receiveTransactions: sinonSandbox.stub(),
			undo: sinonSandbox.stub(),
			undoUnconfirmed: sinonSandbox.stub(),
			undoUnconfirmedList: sinonSandbox.stub(),
			removeUnconfirmedTransaction: sinonSandbox.stub(),
		};
		modulesStub = {
			accounts: modulesAccountsStub,
			blocks: modulesBlocksStub,
			rounds: modulesRoundsStub,
			transactions: modulesTransactionsStub,
		};
		blocksChainModule.onBind(modulesStub);
		modules = BlocksChain.__get__('modules');
	});

	afterEach(() => {
		sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should assign params to library', () => {
			expect(library.logger).to.eql(loggerStub);
			expect(library.db).to.eql(dbStub);
			expect(library.genesisblock).to.eql(genesisblockStub);
			expect(library.bus).to.eql(busStub);
			expect(library.balancesSequence).to.eql(balancesSequenceStub);
			expect(library.logic.block).to.eql(blockStub);
			expect(library.logic.transaction).to.eql(transactionStub);
		});

		it('should call library.logger.trace with "Blocks->Chain: Submodule initialized."', () => {
			expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Chain: Submodule initialized.'
			);
		});

		it('should return self', () => {
			expect(blocksChainModule).to.be.an('object');
			expect(blocksChainModule.saveGenesisBlock).to.be.a('function');
			expect(blocksChainModule.saveBlock).to.be.a('function');
			expect(blocksChainModule.deleteBlock).to.be.a('function');
			expect(blocksChainModule.deleteAfterBlock).to.be.a('function');
			expect(blocksChainModule.applyGenesisBlock).to.be.a('function');
			expect(blocksChainModule.applyBlock).to.be.a('function');
			expect(blocksChainModule.broadcastReducedBlock).to.be.a('function');
			expect(blocksChainModule.deleteLastBlock).to.be.a('function');
			expect(blocksChainModule.recoverChain).to.be.a('function');
			expect(blocksChainModule.onBind).to.be.a('function');
		});
	});

	describe('saveGenesisBlock', () => {
		var saveBlockTemp;
		describe('library.db.blocks.getGenesisBlockId', () => {
			describe('when fails', () => {
				beforeEach(() => {
					library.db.blocks.getGenesisBlockId.rejects('getGenesisBlockId-ERR');
				});

				afterEach(() => {
					expect(loggerStub.error.args[0][0]).to.contains(
						'getGenesisBlockId-ERR'
					);
				});

				it('should throws error', done => {
					blocksChainModule.saveGenesisBlock(err => {
						expect(err).to.equal('Blocks#saveGenesisBlock error');
						done();
					});
				});
			});

			describe('when succeeds', () => {
				describe('if returns empty row (genesis block is not in database)', () => {
					beforeEach(() => {
						library.db.blocks.getGenesisBlockId.resolves([]);
						saveBlockTemp = blocksChainModule.saveBlock;
					});
					afterEach(() => {
						blocksChainModule.saveBlock = saveBlockTemp;
					});

					describe('self.saveBlock', () => {
						beforeEach(() => {
							blocksChainModule.saveBlock = sinonSandbox.stub();
						});

						describe('when fails', () => {
							beforeEach(() => {
								blocksChainModule.saveBlock.callsArgWith(
									1,
									'saveBlock-ERR',
									null
								);
							});

							it('should call callback with error', done => {
								blocksChainModule.saveGenesisBlock(err => {
									expect(err).to.equal('saveBlock-ERR');
									done();
								});
							});
						});
						describe('when succeeds', () => {
							beforeEach(() => {
								blocksChainModule.saveBlock.callsArgWith(1, null, true);
							});

							it('should return cb', done => {
								blocksChainModule.saveGenesisBlock(cb => {
									expect(cb).to.be.null;
									done();
								});
							});
						});
					});
				});

				describe('if returns row', () => {
					beforeEach(() => {
						library.db.blocks.getGenesisBlockId.resolves([{ id: 1 }]);
					});

					it('should return cb', done => {
						blocksChainModule.saveGenesisBlock(err => {
							expect(err).to.be.undefined;
							done();
						});
					});
				});
			});
		});
	});

	describe('saveBlock', () => {
		var afterSaveTemp;
		beforeEach(() => {
			afterSaveTemp = __private.afterSave;
		});

		afterEach(() => {
			__private.afterSave = afterSaveTemp;
		});

		describe('when tx param is passed', () => {
			var txStub;
			beforeEach(() => {
				txStub = {
					blocks: {
						save: sinonSandbox.stub(),
					},
					transactions: {
						save: sinonSandbox.stub(),
					},
					batch: sinonSandbox.stub(),
				};
			});
			describe('tx.batch', () => {
				describe('when fails', () => {
					beforeEach(() => {
						txStub.batch.rejects('txbatch-ERR');
					});

					it('should call callback with error', done => {
						var block = {
							id: 1,
							transactions: [{ id: 1, type: 0 }, { id: 2, type: 1 }],
						};
						blocksChainModule.saveBlock(
							block,
							err => {
								expect(err).to.equal('Blocks#saveBlock error');
								done();
							},
							txStub
						);
					});
				});

				describe('when succeeds', () => {
					beforeEach(() => {
						txStub.batch.resolves();
						__private.afterSave = sinonSandbox
							.stub()
							.callsArgWith(1, null, true);
					});

					it('should call __private.afterSave', done => {
						var block = {
							id: 1,
							transactions: [{ id: 1, type: 0 }, { id: 2, type: 1 }],
						};
						blocksChainModule.saveBlock(
							block,
							() => {
								expect(__private.afterSave.calledOnce).to.be.true;
								done();
							},
							txStub
						);
					});
				});
			});
		});

		describe('when tx param is not passed', () => {
			var txStub;
			beforeEach(() => {
				txStub = {
					blocks: {
						save: sinonSandbox.stub(),
					},
					transactions: {
						save: sinonSandbox.stub(),
					},
					batch: sinonSandbox.stub(),
				};
				library.db.tx.callsArgWith(1, txStub);
			});
			describe('tx.batch', () => {
				describe('when fails', () => {
					beforeEach(() => {
						txStub.batch.rejects('txbatch-ERR');
					});

					it('should call callback with error', done => {
						var block = {
							id: 1,
							transactions: [{ id: 1, type: 0 }, { id: 2, type: 1 }],
						};
						blocksChainModule.saveBlock(block, err => {
							expect(err).to.equal('Blocks#saveBlock error');
							done();
						});
					});
				});
				describe('when succeeds', () => {
					beforeEach(() => {
						txStub.batch.resolves();
						__private.afterSave = sinonSandbox
							.stub()
							.callsArgWith(1, null, true);
					});

					it('should call __private.afterSave', done => {
						var block = {
							id: 1,
							transactions: [{ id: 1, type: 0 }, { id: 2, type: 1 }],
						};
						blocksChainModule.saveBlock(block, () => {
							expect(__private.afterSave.calledOnce).to.be.true;
							done();
						});
					});
				});
			});
		});
	});

	describe('__private.afterSave', () => {
		afterEach(() => {
			expect(library.bus.message.calledOnce).to.be.true;
			expect(library.bus.message.args[0][0]).to.equal('transactionsSaved');
			expect(library.bus.message.args[0][1]).to.deep.equal([
				{ id: 1, type: 0 },
				{ id: 2, type: 1 },
			]);
		});

		it('should call afterSave for all transactions', done => {
			var block = {
				id: 1,
				transactions: [{ id: 1, type: 0 }, { id: 2, type: 1 }],
			};
			__private.afterSave(block, () => {
				expect(library.logic.transaction.afterSave.callCount).to.equal(2);
				done();
			});
		});
	});

	describe('deleteBlock', () => {
		describe('library.db.blocks.deleteBlock', () => {
			describe('when fails', () => {
				beforeEach(() => {
					library.db.blocks.deleteBlock.rejects('deleteBlock-ERR');
				});

				afterEach(() => {
					expect(loggerStub.error.args[0][0]).to.contains('deleteBlock-ERR');
				});

				it('should call callback with error', done => {
					blocksChainModule.deleteBlock(1, err => {
						expect(err).to.equal('Blocks#deleteBlock error');
						done();
					});
				});
			});

			describe('when succeeds', () => {
				beforeEach(() => {
					library.db.blocks.deleteBlock.resolves(true);
				});

				it('should return immediate', done => {
					blocksChainModule.deleteBlock(1, () => {
						done();
					});
				});
			});
		});
	});

	describe('deleteAfterBlock', () => {
		describe('library.db.blocks.deleteAfterBlock', () => {
			describe('when fails', () => {
				beforeEach(() => {
					library.db.blocks.deleteAfterBlock.rejects('deleteAfterBlock-ERR');
				});

				afterEach(() => {
					expect(loggerStub.error.args[0][0]).to.contains(
						'deleteAfterBlock-ERR'
					);
				});

				it('should call callback with error', done => {
					blocksChainModule.deleteAfterBlock(1, err => {
						expect(err).to.equal('Blocks#deleteAfterBlock error');
						done();
					});
				});
			});

			describe('when succeeds', () => {
				beforeEach(() => {
					library.db.blocks.deleteAfterBlock.resolves(true);
				});

				it('should return immediate', done => {
					blocksChainModule.deleteAfterBlock(1, (err, res) => {
						expect(err).to.be.null;
						expect(res).to.be.true;
						done();
					});
				});
			});
		});
	});

	describe('applyGenesisBlock', () => {
		let applyTransactionTemp;
		beforeEach(() => {
			modules.rounds.tick.callsArgWith(1, null, true);
			applyTransactionTemp = __private.applyTransaction;
			__private.applyTransaction = sinonSandbox.stub();
		});
		afterEach(() => {
			__private.applyTransaction = applyTransactionTemp;
		});
		describe('when block.transactions is empty', () => {
			afterEach(() => {
				expect(modules.blocks.utils.getBlockProgressLogger.calledOnce).to.be
					.true;
				expect(modules.blocks.lastBlock.set.calledOnce).to.be.true;
				expect(modules.blocks.lastBlock.set.args[0][0]).to.deep.equal({
					id: 1,
					height: 1,
					transactions: [],
				});
				expect(modules.rounds.tick.args[0][0]).to.deep.equal({
					id: 1,
					height: 1,
					transactions: [],
				});
			});
			it('modules.rouds.tick should call a callback', done => {
				blocksChainModule.applyGenesisBlock(
					{ id: 1, height: 1, transactions: [] },
					() => {
						done();
					}
				);
			});
		});
		describe('when block.transactions is not empty', () => {
			describe('modules.accounts.setAccountAndGet', () => {
				describe('when fails', () => {
					beforeEach(() => {
						modules.accounts.setAccountAndGet.callsArgWith(
							1,
							'setAccountAndGet-ERR',
							true
						);
					});
					afterEach(() => {
						expect(modules.blocks.utils.getBlockProgressLogger.calledOnce).to.be
							.true;
					});
					it('should return process.exit(0)', done => {
						process.exit = done;
						blocksChainModule.applyGenesisBlock(
							{
								id: 1,
								height: 1,
								transactions: [
									{ id: 5, type: 3 },
									{ id: 6, type: 2 },
									{ id: 7, type: 1 },
								],
							},
							() => {
								done();
							}
						);
					});
				});
				describe('when succeeds', () => {
					beforeEach(() => {
						modules.accounts.setAccountAndGet.callsArgWith(1, null, true);
					});
					describe('__private.applyTransaction', () => {
						describe('when fails', () => {
							beforeEach(() => {
								__private.applyTransaction.callsArgWith(
									3,
									'applyTransaction-ERR',
									null
								);
							});
							afterEach(() => {
								expect(modules.blocks.utils.getBlockProgressLogger.calledOnce)
									.to.be.true;
								expect(__private.applyTransaction.callCount).to.equal(1);
							});
							it('should return process.exit(0)', done => {
								process.exit = done;
								blocksChainModule.applyGenesisBlock(
									{
										id: 1,
										height: 1,
										transactions: [
											{ id: 5, type: 3 },
											{ id: 6, type: 2 },
											{ id: 7, type: 1 },
										],
									},
									err => {
										expect(err).to.equal('applyTransaction-ERR');
										done();
									}
								);
							});
						});
						describe('when succeeds', () => {
							beforeEach(() => {
								__private.applyTransaction.callsArgWith(3, null, true);
							});
							afterEach(() => {
								expect(modules.blocks.utils.getBlockProgressLogger.calledOnce)
									.to.be.true;
								expect(__private.applyTransaction.callCount).to.equal(3);
								expect(modules.blocks.lastBlock.set.calledOnce).to.be.true;
								expect(modules.blocks.lastBlock.set.args[0][0]).to.deep.equal({
									id: 1,
									height: 1,
									transactions: [
										{ id: 6, type: 2 },
										{ id: 7, type: 1 },
										{ id: 5, type: 3 },
									],
								});
								expect(modules.rounds.tick.args[0][0]).to.deep.equal({
									id: 1,
									height: 1,
									transactions: [
										{ id: 6, type: 2 },
										{ id: 7, type: 1 },
										{ id: 5, type: 3 },
									],
								});
							});
							it('modules.rouds.tick should call a callback', done => {
								blocksChainModule.applyGenesisBlock(
									{
										id: 1,
										height: 1,
										transactions: [
											{ id: 5, type: 3 },
											{ id: 6, type: 2 },
											{ id: 7, type: 1 },
										],
									},
									() => {
										done();
									}
								);
							});
						});
					});
				});
			});
		});
	});

	describe('__private.applyTransaction', () => {
		describe('modules.transactions.applyUnconfirmed', () => {
			describe('when fails', () => {
				beforeEach(() => {
					modules.transactions.applyUnconfirmed.callsArgWith(
						2,
						'applyUnconfirmed-ERR',
						null
					);
				});
				it('should call callback with error', done => {
					var block = {
						id: 1,
						transactions: [{ id: 1, type: 0 }, { id: 2, type: 1 }],
					};
					__private.applyTransaction(block, { id: 1, type: 1 }, 'a1', err => {
						expect(err.message).to.equal('applyUnconfirmed-ERR');
						expect(err.transaction).to.deep.equal({ id: 1, type: 1 });
						expect(err.block).to.deep.equal(block);
						done();
					});
				});
			});

			describe('when succeeds', () => {
				beforeEach(() => {
					modules.transactions.applyUnconfirmed.callsArgWith(2, null, true);
				});

				describe('modules.transactions.apply', () => {
					describe('when fails', () => {
						beforeEach(() => {
							modules.transactions.apply.callsArgWith(3, 'apply-ERR', null);
						});

						it('should call callback with error', done => {
							var block = {
								id: 1,
								transactions: [{ id: 1, type: 0 }, { id: 2, type: 1 }],
							};
							__private.applyTransaction(
								block,
								{ id: 1, type: 1 },
								'a1',
								err => {
									expect(err.message).to.equal(
										'Failed to apply transaction: 1'
									);
									expect(err.transaction).to.deep.equal({ id: 1, type: 1 });
									expect(err.block).to.deep.equal(block);
									done();
								}
							);
						});
					});

					describe('when succeeds', () => {
						beforeEach(() => {
							modules.transactions.apply.callsArgWith(3, null, true);
						});

						afterEach(() => {
							expect(modules.transactions.applyUnconfirmed.calledOnce).to.be
								.true;
							expect(modules.transactions.apply.calledOnce).to.be.true;
						});

						it('should return immediate', done => {
							var block = {
								id: 1,
								transactions: [{ id: 1, type: 0 }, { id: 2, type: 1 }],
							};
							__private.applyTransaction(
								block,
								{ id: 1, type: 1 },
								'a1',
								() => {
									done();
								}
							);
						});
					});
				});
			});
		});
	});

	describe('applyBlock', () => {
		var saveBlockTemp;
		beforeEach(done => {
			saveBlockTemp = blocksChainModule.saveBlock;
			blocksChainModule.saveBlock = sinonSandbox
				.stub()
				.callsArgWith(1, null, true);
			modules.rounds.tick.callsArgWith(1, null, true);
			process.emit = sinonSandbox.stub();
			library.db.tx = (desc, tx) => {
				return tx();
			};
			done();
		});
		afterEach(done => {
			blocksChainModule.saveBlock = saveBlockTemp;
			expect(modules.blocks.isActive.set.calledTwice).to.be.true;
			done();
		});
		describe('undoUnconfirmedListStep', () => {
			beforeEach(() => {
				// applyUnconfirmedStep
				modules.accounts.setAccountAndGet.callsArgWith(1, null, 'sender1');
				modules.transactions.applyUnconfirmed.callsArgWith(2, null, null);
				// applyConfirmedStep
				modules.accounts.getAccount.callsArgWith(1, null, 'sender1');
			});
			describe('modules.transactions.undoUnconfirmedList', () => {
				describe('when fails', () => {
					beforeEach(() => {
						modules.transactions.undoUnconfirmedList.callsArgWith(
							0,
							'undoUnconfirmedList-ERR',
							null
						);
					});
					it('should call a callback with error', done => {
						blocksChainModule.applyBlock({ id: 5, height: 5 }, true, err => {
							expect(err).to.equal('Failed to undo unconfirmed list');
							done();
						});
					});
				});
			});
			describe('when succeeds', () => {});
		});
		describe('applyUnconfirmedStep', () => {
			beforeEach(() => {
				modules.transactions.undoUnconfirmedList.callsArgWith(0, null, true);
			});
			describe('when block.transactions is undefined', () => {
				beforeEach(() => {
					modules.transactions.undoUnconfirmedList.callsArgWith(0, null, true);
					modules.accounts.setAccountAndGet.callsArgWith(1, null, 'sender1');
					modules.transactions.applyUnconfirmed.callsArgWith(2, null, true);
				});
				it('should call a callback with error', done => {
					blocksChainModule.applyBlock(
						{ id: 6, height: 6, transactions: undefined },
						true,
						err => {
							expect(err.message).to.equal(
								'expecting an array or an iterable object but got [object Null]'
							);
							done();
						}
					);
				});
			});
			describe('modules.accounts.setAccountAndGet', () => {
				beforeEach(() => {
					modules.accounts.setAccountAndGet.callsArgWith(1, null, 'sender1');
				});
				describe('modules.transactions.applyUnconfirmed', () => {
					describe('when fails', () => {
						beforeEach(() => {
							modules.transactions.applyUnconfirmed
								.onCall(0)
								.callsArgWith(2, null, true);
							modules.transactions.applyUnconfirmed
								.onCall(1)
								.callsArgWith(2, 'applyUnconfirmed-ERR', null);
						});
						describe('catch', () => {
							describe('modules.accounts.getAccount', () => {
								describe('when fails', () => {
									beforeEach(() => {
										modules.accounts.getAccount
											.onCall(0)
											.callsArgWith(1, 'getAccount-ERR', null)
											.callsArgWith(1, null, 'sender1');
										modules.transactions.apply.callsArgWith(3, null, true);
									});
									it('should call a callback with error', done => {
										blocksChainModule.applyBlock(
											{
												id: 5,
												height: 5,
												transactions: [{ id: 1, type: 0 }, { id: 2, type: 1 }],
											},
											true,
											err => {
												expect(err).to.equal('getAccount-ERR');
												done();
											}
										);
									});
								});
								describe('when succeeds', () => {
									beforeEach(() => {
										modules.accounts.getAccount.callsArgWith(
											1,
											null,
											'sender1'
										);
									});
									describe('library.logic.transaction.undoUnconfirmed', () => {
										describe('when fails', () => {
											beforeEach(() => {
												library.logic.transaction.undoUnconfirmed.callsArgWith(
													2,
													'undoUnconfirmed-ERR',
													null
												);
											});
											it('should call a callback with error', done => {
												blocksChainModule.applyBlock(
													{
														id: 5,
														height: 5,
														transactions: [
															{ id: 1, type: 0 },
															{ id: 2, type: 1 },
														],
													},
													true,
													err => {
														expect(err).to.equal('undoUnconfirmed-ERR');
														done();
													}
												);
											});
										});
										describe('when succeeds', () => {
											describe('applyConfirmedStep', () => {
												describe('when block.transactions is empty', () => {
													beforeEach(() => {
														modules.transactions.undoUnconfirmedList.callsArgWith(
															0,
															null,
															true
														);
														modules.accounts.setAccountAndGet.callsArgWith(
															1,
															null,
															'sender1'
														);
													});
													it('should call a callback with no error', done => {
														blocksChainModule.applyBlock(
															{ id: 6, height: 6, transactions: [] },
															true,
															err => {
																expect(err).to.be.null;
																done();
															}
														);
													});
												});
												describe('when block.transactions is not empty', () => {
													beforeEach(() => {
														modules.transactions.undoUnconfirmedList.callsArgWith(
															0,
															null,
															true
														);
														modules.accounts.setAccountAndGet.callsArgWith(
															1,
															null,
															'sender1'
														);
														modules.transactions.applyUnconfirmed
															.onCall(1)
															.callsArgWith(2, null, true);
													});
													describe('modules.accounts.getAccount', () => {
														describe('when fails', () => {
															beforeEach(() => {
																modules.accounts.getAccount.callsArgWith(
																	1,
																	'getAccount-ERR',
																	null
																);
															});
															it('should call a callback with error', done => {
																blocksChainModule.applyBlock(
																	{
																		id: 5,
																		height: 5,
																		transactions: [
																			{ id: 1, type: 0 },
																			{ id: 2, type: 1 },
																		],
																	},
																	true,
																	err => {
																		expect(err).to.equal(
																			'Failed to apply transaction: 1 - getAccount-ERR'
																		);
																		done();
																	}
																);
															});
														});
														describe('when succeeds', () => {
															beforeEach(() => {
																modules.accounts.getAccount.callsArgWith(
																	1,
																	null,
																	'sender1'
																);
															});
															describe('modules.transactions.apply', () => {
																describe('when fails', () => {
																	beforeEach(() => {
																		modules.transactions.apply.callsArgWith(
																			3,
																			'apply-ERR',
																			null
																		);
																	});
																	it('should call a callback with error', done => {
																		blocksChainModule.applyBlock(
																			{
																				id: 5,
																				height: 5,
																				transactions: [
																					{ id: 1, type: 0 },
																					{ id: 2, type: 1 },
																				],
																			},
																			true,
																			err => {
																				expect(err).to.equal(
																					'Failed to apply transaction: 1 - apply-ERR'
																				);
																				done();
																			}
																		);
																	});
																});
																describe('when succeeds', () => {
																	beforeEach(() => {
																		modules.transactions.apply.callsArgWith(
																			3,
																			null,
																			true
																		);
																	});
																	describe('saveBlockStep', () => {
																		afterEach(() => {
																			expect(
																				modules.blocks.lastBlock.set.calledOnce
																			).to.be.true;
																			expect(
																				modules.blocks.lastBlock.set.args[0][0]
																			).to.deep.equal({
																				id: 5,
																				height: 5,
																				transactions: [
																					{ id: 1, type: 0 },
																					{ id: 2, type: 1 },
																				],
																			});
																		});
																		describe('when saveBlock is true', () => {
																			describe('when self.saveBlock fails', () => {
																				beforeEach(() => {
																					blocksChainModule.saveBlock.callsArgWith(
																						1,
																						'saveBlock-ERR',
																						null
																					);
																				});
																				afterEach(() => {
																					expect(
																						loggerStub.error.args[0][0]
																					).to.contains(
																						'Failed to save block...'
																					);
																					expect(
																						loggerStub.error.args[0][1]
																					).to.contains('saveBlock-ERR');
																					expect(
																						loggerStub.error.args[1][0]
																					).to.equal('Block');
																					expect(
																						loggerStub.error.args[1][1]
																					).to.deep.equal({
																						id: 5,
																						height: 5,
																						transactions: [
																							{ id: 1, type: 0 },
																							{ id: 2, type: 1 },
																						],
																					});
																					expect(
																						blocksChainModule.saveBlock
																							.args[0][0]
																					).to.deep.equal({
																						id: 5,
																						height: 5,
																						transactions: [
																							{ id: 1, type: 0 },
																							{ id: 2, type: 1 },
																						],
																					});
																				});
																				it('should call a callback with error', done => {
																					blocksChainModule.applyBlock(
																						{
																							id: 5,
																							height: 5,
																							transactions: [
																								{ id: 1, type: 0 },
																								{ id: 2, type: 1 },
																							],
																						},
																						true,
																						err => {
																							expect(err).to.equal(
																								'saveBlock-ERR'
																							);
																							done();
																						}
																					);
																				});
																			});
																			describe('when self.saveBlock succeeds', () => {
																				beforeEach(() => {
																					blocksChainModule.saveBlock.callsArgWith(
																						1,
																						null,
																						true
																					);
																				});
																				afterEach(() => {
																					expect(
																						loggerStub.debug.args[0][0]
																					).to.contains(
																						'Block applied correctly with 2 transactions'
																					);
																					expect(
																						blocksChainModule.saveBlock
																							.args[0][0]
																					).to.deep.equal({
																						id: 5,
																						height: 5,
																						transactions: [
																							{ id: 1, type: 0 },
																							{ id: 2, type: 1 },
																						],
																					});
																					expect(library.bus.message.calledOnce)
																						.to.be.true;
																					expect(
																						library.bus.message.args[0][0]
																					).to.deep.equal('newBlock');
																					expect(
																						library.bus.message.args[0][1]
																					).to.deep.equal({
																						id: 5,
																						height: 5,
																						transactions: [
																							{ id: 1, type: 0 },
																							{ id: 2, type: 1 },
																						],
																					});
																				});
																				describe('modules.rounds.tick', () => {
																					describe('when fails', () => {
																						beforeEach(() => {
																							modules.rounds.tick.callsArgWith(
																								1,
																								'tick-ERR',
																								null
																							);
																						});
																						it('should call a callback with error', done => {
																							blocksChainModule.applyBlock(
																								{
																									id: 5,
																									height: 5,
																									transactions: [
																										{ id: 1, type: 0 },
																										{ id: 2, type: 1 },
																									],
																								},
																								true,
																								err => {
																									expect(err).to.equal(
																										'tick-ERR'
																									);
																									done();
																								}
																							);
																						});
																					});
																					describe('when Snapshot finished', () => {
																						beforeEach(() => {
																							modules.rounds.tick.callsArgWith(
																								1,
																								'Snapshot finished',
																								null
																							);
																						});
																						afterEach(() => {
																							expect(
																								loggerStub.info.args[0][0]
																							).to.equal('Snapshot finished');
																							expect(process.emit.calledOnce).to
																								.be.true;
																						});
																						it('should emit SIGTERM and call a callback with error', done => {
																							blocksChainModule.applyBlock(
																								{
																									id: 5,
																									height: 5,
																									transactions: [
																										{ id: 1, type: 0 },
																										{ id: 2, type: 1 },
																									],
																								},
																								true,
																								err => {
																									expect(err).to.equal(
																										'Snapshot finished'
																									);
																									done();
																								}
																							);
																						});
																					});
																					describe('when succeeds', () => {
																						beforeEach(() => {
																							modules.rounds.tick.callsArgWith(
																								1,
																								null,
																								true
																							);
																						});
																						it('should call a callback with no error', done => {
																							blocksChainModule.applyBlock(
																								{
																									id: 5,
																									height: 5,
																									transactions: [
																										{ id: 1, type: 0 },
																										{ id: 2, type: 1 },
																									],
																								},
																								true,
																								err => {
																									expect(err).to.be.null;
																									done();
																								}
																							);
																						});
																					});
																				});
																			});
																		});
																		describe('when saveBlock is false', () => {
																			afterEach(() => {
																				expect(library.bus.message.calledOnce)
																					.to.be.true;
																				expect(
																					library.bus.message.args[0][0]
																				).to.deep.equal('newBlock');
																				expect(
																					library.bus.message.args[0][1]
																				).to.deep.equal({
																					id: 5,
																					height: 5,
																					transactions: [
																						{ id: 1, type: 0 },
																						{ id: 2, type: 1 },
																					],
																				});
																			});
																			describe('modules.rounds.tick', () => {
																				describe('when fails', () => {
																					beforeEach(() => {
																						modules.rounds.tick.callsArgWith(
																							1,
																							'tick-ERR',
																							null
																						);
																					});
																					it('should call a callback with error', done => {
																						blocksChainModule.applyBlock(
																							{
																								id: 5,
																								height: 5,
																								transactions: [
																									{ id: 1, type: 0 },
																									{ id: 2, type: 1 },
																								],
																							},
																							false,
																							err => {
																								expect(err).to.equal(
																									'tick-ERR'
																								);
																								done();
																							}
																						);
																					});
																				});
																				describe('when Snapshot finished', () => {
																					beforeEach(() => {
																						modules.rounds.tick.callsArgWith(
																							1,
																							'Snapshot finished',
																							null
																						);
																						process.emit = sinonSandbox.stub();
																					});
																					afterEach(() => {
																						expect(
																							loggerStub.info.args[0][0]
																						).to.equal('Snapshot finished');
																						expect(process.emit.calledOnce).to
																							.be.true;
																					});
																					it('should emit SIGTERM and call a callback with error', done => {
																						blocksChainModule.applyBlock(
																							{
																								id: 5,
																								height: 5,
																								transactions: [
																									{ id: 1, type: 0 },
																									{ id: 2, type: 1 },
																								],
																							},
																							false,
																							err => {
																								expect(err).to.equal(
																									'Snapshot finished'
																								);
																								done();
																							}
																						);
																					});
																				});
																				describe('when succeeds', () => {
																					beforeEach(() => {
																						modules.rounds.tick.callsArgWith(
																							1,
																							null,
																							true
																						);
																					});
																					it('should call a callback with no error', done => {
																						blocksChainModule.applyBlock(
																							{
																								id: 5,
																								height: 5,
																								transactions: [
																									{ id: 1, type: 0 },
																									{ id: 2, type: 1 },
																								],
																							},
																							false,
																							err => {
																								expect(err).to.be.null;
																								done();
																							}
																						);
																					});
																				});
																			});
																		});
																	});
																});
															});
														});
													});
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});

	describe('broadcastReducedBlock', () => {
		it('should call library.bus.message with reducedBlock and broadcast', () => {
			blocksChainModule.broadcastReducedBlock({ id: 3, hright: 3 }, true);
			expect(library.bus.message.calledOnce).to.be.true;
			expect(library.bus.message.args[0][0]).to.equal('broadcastBlock');
			expect(library.bus.message.args[0][1]).to.deep.equal({
				id: 3,
				hright: 3,
			});
			expect(library.bus.message.args[0][2]).to.be.true;
		});
	});

	describe('__private.popLastBlock', () => {
		describe('modules.blocks.utils.loadBlocksPart', () => {
			describe('when fails', () => {
				describe('returns error', () => {
					beforeEach(() => {
						modules.blocks.utils.loadBlocksPart.callsArgWith(
							1,
							'loadBlocksPart-ERR',
							null
						);
					});

					it('should call callback with error', done => {
						__private.popLastBlock({ id: 3, height: 3 }, err => {
							expect(err).to.equal('loadBlocksPart-ERR');
							done();
						});
					});
				});

				describe('returns empty', () => {
					beforeEach(() => {
						modules.blocks.utils.loadBlocksPart.callsArgWith(1, null, []);
					});

					it('should call callback with error "previousBlock is null"', done => {
						__private.popLastBlock({ id: 3, height: 3 }, err => {
							expect(err).to.equal('previousBlock is null');
							done();
						});
					});
				});
			});

			describe('when succeeds', () => {
				beforeEach(() => {
					modules.blocks.utils.loadBlocksPart.callsArgWith(1, null, [
						{ id: 2, height: 2 },
					]);
				});

				describe('modules.accounts.getAccount', () => {
					describe('when fails', () => {
						beforeEach(() => {
							return modules.accounts.getAccount.callsArgWith(
								1,
								'getAccount-ERR',
								null
							);
						});

						afterEach(() => {
							expect(loggerStub.error.args[0][0]).to.equal(
								'Failed to undo transactions'
							);
							return expect(loggerStub.error.args[0][1]).to.equal(
								'getAccount-ERR'
							);
						});

						it('should call process.exit(0)', done => {
							process.exit = done;
							__private.popLastBlock(
								{ id: 3, height: 3, transactions: [{ id: 7, type: 0 }] },
								() => {
									done();
								}
							);
						});
					});

					describe('when succeeds', () => {
						beforeEach(() => {
							modules.accounts.getAccount.callsArgWith(1, null, '12ab');
							modules.transactions.undo.callsArgWith(3, null, true);
							modules.transactions.undoUnconfirmed.callsArgWith(1, null, true);
						});
						describe('modules.rounds.backwardTick', () => {
							describe('when fails', () => {
								beforeEach(() => {
									modules.rounds.backwardTick.callsArgWith(
										2,
										'backwardTick-ERR',
										null
									);
								});

								afterEach(() => {
									expect(loggerStub.error.args[0][0]).to.equal(
										'Failed to perform backwards tick'
									);
									expect(loggerStub.error.args[0][1]).to.equal(
										'backwardTick-ERR'
									);
								});

								it('should call process.exit(0)', done => {
									process.exit = done;
									__private.popLastBlock(
										{ id: 3, height: 3, transactions: [{ id: 7, type: 0 }] },
										() => {
											done();
										}
									);
								});
							});
							describe('when succeeds', () => {
								var deleteBlockTemp;
								beforeEach(() => {
									modules.rounds.backwardTick.callsArgWith(2, null, true);
									deleteBlockTemp = blocksChainModule.deleteBlock;
									blocksChainModule.deleteBlock = sinonSandbox.stub();
								});

								afterEach(() => {
									blocksChainModule.deleteBlock = deleteBlockTemp;
								});

								describe('self.deleteBlock', () => {
									describe('when fails', () => {
										beforeEach(() => {
											blocksChainModule.deleteBlock.callsArgWith(
												1,
												'deleteBlock-ERR',
												null
											);
										});

										afterEach(() => {
											expect(loggerStub.error.args[0][0]).to.equal(
												'Failed to delete block'
											);
											expect(loggerStub.error.args[0][1]).to.equal(
												'deleteBlock-ERR'
											);
										});

										it('should call process.exit(0)', done => {
											process.exit = done;
											__private.popLastBlock(
												{
													id: 3,
													height: 3,
													transactions: [{ id: 7, type: 0 }],
												},
												() => {
													done();
												}
											);
										});
									});

									describe('when succeeds', () => {
										beforeEach(() => {
											blocksChainModule.deleteBlock.callsArgWith(1, null, true);
										});

										it('should return previousBlock and no error', done => {
											__private.popLastBlock(
												{
													id: 3,
													height: 3,
													transactions: [{ id: 7, type: 0 }],
												},
												(err, previousBlock) => {
													expect(err).to.be.null;
													expect(previousBlock).to.deep.equal({
														id: 2,
														height: 2,
													});
													done();
												}
											);
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});

	describe('deleteLastBlock', () => {
		var popLastBlockTemp;
		before(() => {
			popLastBlockTemp = __private.popLastBlock;
		});

		after(() => {
			__private.popLastBlock = popLastBlockTemp;
		});

		afterEach(() => {
			expect(modules.blocks.lastBlock.get.calledOnce).to.be.true;
			expect(loggerStub.warn.args[0][0]).to.equal('Deleting last block');
		});

		describe('when lastBlock.height = 1', () => {
			beforeEach(() => {
				modules.blocks.lastBlock.get.returns({ id: 1, height: 1 });
			});
			it('should call callback with error "Cannot delete genesis block', done => {
				blocksChainModule.deleteLastBlock(err => {
					expect(err).to.equal('Cannot delete genesis block');
					expect(loggerStub.warn.args[0][1]).to.deep.equal({
						id: 1,
						height: 1,
					});
					done();
				});
			});
		});
	});

	describe('recoverChain', () => {
		var deleteLastBlockTemp;
		beforeEach(() => {
			deleteLastBlockTemp = blocksChainModule.deleteLastBlock;
		});
		afterEach(() => {
			expect(loggerStub.warn.args[0][0]).to.equal(
				'Chain comparison failed, starting recovery'
			);
			blocksChainModule.deleteLastBlock = deleteLastBlockTemp;
		});

		describe('self.deleteLastBlock', () => {
			describe('when fails', () => {
				beforeEach(() => {
					blocksChainModule.deleteLastBlock = sinonSandbox
						.stub()
						.callsArgWith(0, 'deleteLastBlock-ERR', null);
				});
				afterEach(() => {
					expect(loggerStub.error.args[0][0]).to.equal('Recovery failed');
				});

				it('should call callback with error', done => {
					blocksChainModule.recoverChain(err => {
						expect(err).to.equal('deleteLastBlock-ERR');
						done();
					});
				});
			});

			describe('when succeeds', () => {
				beforeEach(() => {
					blocksChainModule.deleteLastBlock = sinonSandbox
						.stub()
						.callsArgWith(0, null, { id: 1 });
				});
				afterEach(() => {
					expect(loggerStub.info.args[0][0]).to.equal(
						'Recovery complete, new last block'
					);
					expect(loggerStub.info.args[0][1]).to.equal(1);
				});
				it('should call callback with error = null', done => {
					blocksChainModule.recoverChain(err => {
						expect(err).to.be.null;
						done();
					});
				});
			});
		});
	});

	describe('onBind', () => {
		beforeEach(() => {
			loggerStub.trace.reset();
			__private.loaded = false;
			blocksChainModule.onBind(modulesStub);
		});

		it('should call library.logger.trace with "Blocks->Chain: Shared modules bind."', () => {
			expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Chain: Shared modules bind.'
			);
		});

		it('should assign params to modules', () => {
			expect(modules.accounts).to.equal(modulesStub.accounts);
			expect(modules.blocks).to.equal(modulesStub.blocks);
			expect(modules.rounds).to.equal(modulesStub.rounds);
			expect(modules.transactions).to.equal(modulesStub.transactions);
		});

		it('should set __private.loaded to true', () => {
			expect(__private.loaded).to.be.true;
		});
	});
});
