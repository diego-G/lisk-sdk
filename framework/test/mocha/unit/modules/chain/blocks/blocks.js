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

const rewire = require('rewire');
const crypto = require('crypto');

const { EPOCH_TIME } = global.constants;

const Blocks = rewire('../../../../../../src/modules/chain/submodules/blocks');

describe('blocks', () => {
	let blocksInstance;
	let self;
	let library;
	let __private;
	let storageStub;
	let loggerStub;
	let logicBlockStub;
	let moduleTransactionsStub;
	let schemaStub;
	let dbSequenceStub;
	let sequenceStub;
	let peersStub;
	let dummyGenesisblock;
	let accountStub;
	let busStub;
	let balancesSequenceStub;
	let channelStub;
	let applicationStateStub;
	let scope;

	beforeEach(done => {
		dummyGenesisblock = {
			block: {
				id: '6524861224470851795',
				height: 1,
			},
		};
		loggerStub = {
			trace: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
		};
		storageStub = {
			entities: {
				Block: {
					isPersisted: sinonSandbox.stub().resolves(true),
					get: sinonSandbox.stub(),
				},
			},
		};
		logicBlockStub = sinonSandbox.stub();
		moduleTransactionsStub = sinonSandbox.stub();
		schemaStub = sinonSandbox.stub();
		dbSequenceStub = sinonSandbox.stub();
		sequenceStub = sinonSandbox.stub();
		accountStub = sinonSandbox.stub();
		busStub = sinonSandbox.stub();
		balancesSequenceStub = sinonSandbox.stub();
		channelStub = {
			publish: sinonSandbox.stub(),
		};

		applicationStateStub = {
			height: 1,
			nethash: 'test broadhash',
			version: '1.0.0-beta.3',
			wsPort: '3001',
			httpPort: '3000',
			minVersion: '1.0.0-beta.0',
			protocolVersion: '1.0',
			nonce: 'test nonce',
		};

		applicationStateStub.broadhash = applicationStateStub.nethash;

		scope = {
			components: { logger: loggerStub, storage: storageStub },
			logic: {
				account: accountStub,
				block: logicBlockStub,
				peers: peersStub,
			},
			channel: channelStub,
			schema: schemaStub,
			dbSequence: dbSequenceStub,
			sequence: sequenceStub,
			genesisBlock: dummyGenesisblock,
			bus: busStub,
			balancesSequence: balancesSequenceStub,
			config: {
				loading: {},
			},
			modules: {
				transactions: moduleTransactionsStub,
			},
			applicationState: applicationStateStub,
		};

		blocksInstance = new Blocks((err, cbSelf) => {
			expect(err).to.be.undefined;
			self = cbSelf;
			library = Blocks.__get__('library');
			__private = Blocks.__get__('__private');
			done();
		}, scope);
	});

	afterEach(done => {
		sinonSandbox.restore();
		done();
	});

	describe('constructor', () => {
		it('should assign params to library', async () => {
			expect(library.logger).to.eql(loggerStub);
			expect(library.channel).to.eql(channelStub);
		});

		it('should instantiate submodules', async () => {
			expect(self.submodules.chain).to.be.an('object');
			expect(self.submodules.process).to.be.an('object');
			expect(self.submodules.utils).to.be.an('object');
			return expect(self.submodules.verify).to.be.an('object');
		});

		it('should assign submodules to this', async () => {
			expect(self.submodules.chain).to.deep.equal(self.chain);
			expect(self.submodules.process).to.deep.equal(self.process);
			expect(self.submodules.utils).to.deep.equal(self.utils);
			return expect(self.submodules.verify).to.deep.equal(self.verify);
		});

		it('should call callback with result = self', async () =>
			expect(self).to.be.deep.equal(blocksInstance));

		describe('when this.submodules.chain.saveGenesisBlock fails', () => {
			it('should call callback with error', done => {
				storageStub.entities.Block.isPersisted.resolves(false);
				blocksInstance = new Blocks((err, cbSelf) => {
					self = cbSelf;
					library = Blocks.__get__('library');
					__private = Blocks.__get__('__private');
					expect(err).to.equal('Blocks#saveGenesisBlock error');
					expect(self.submodules.chain).to.be.an('object');
					expect(self.submodules.process).to.be.an('object');
					expect(self.submodules.utils).to.be.an('object');
					expect(self.submodules.verify).to.be.an('object');
					done();
				}, scope);
			});
		});
	});

	describe('lastBlock', () => {
		beforeEach(done => {
			__private.lastBlock = dummyGenesisblock;
			done();
		});
		describe('get', () => {
			it('should return __private.lastBlock', async () =>
				expect(blocksInstance.lastBlock.get()).to.deep.equal(
					dummyGenesisblock
				));
		});
		describe('set', () => {
			it('should assign input parameter block to __private.lastBlock and return input parameter', async () => {
				expect(blocksInstance.lastBlock.set({ id: 2 })).to.deep.equal({
					id: 2,
				});
				return expect(__private.lastBlock).to.deep.equal({ id: 2 });
			});
		});
		describe('isFresh', () => {
			describe('when __private.lastBlock = undefined', () => {
				beforeEach(done => {
					__private.lastBlock = undefined;
					done();
				});
				it('should return false', async () =>
					expect(blocksInstance.lastBlock.isFresh()).to.be.false);
			});
			describe('when __private.lastBlock exists', () => {
				describe('when secondsAgo < BLOCK_RECEIPT_TIMEOUT', () => {
					beforeEach(done => {
						const timestamp =
							10000 +
							Math.floor(Date.now() / 1000) -
							Math.floor(new Date(EPOCH_TIME) / 1000);
						__private.lastBlock = { timestamp };
						done();
					});
					it('should return true', async () =>
						expect(blocksInstance.lastBlock.isFresh()).to.be.true);
				});
				describe('when secondsAgo >= BLOCK_RECEIPT_TIMEOUT', () => {
					beforeEach(done => {
						__private.lastBlock = { timestamp: 555555 };
						done();
					});
					it('should return false', async () =>
						expect(blocksInstance.lastBlock.isFresh()).to.be.false);
				});
			});
		});
	});

	describe('lastReceipt', () => {
		const dummyLastReceipt = 1520593240;
		beforeEach(done => {
			__private.lastReceipt = dummyLastReceipt;
			done();
		});
		describe('get', () => {
			it('should return __private.lastReceipt', async () =>
				expect(blocksInstance.lastReceipt.get()).to.equal(dummyLastReceipt));
		});
		describe('update', () => {
			it('should assign update __private.lastReceipt with latest time and return new value', async () => {
				expect(blocksInstance.lastReceipt.update()).to.be.above(
					dummyLastReceipt
				);
				return expect(__private.lastReceipt).to.be.above(dummyLastReceipt);
			});
		});
		describe('isStale', () => {
			describe('when __private.lastReceipt is null', () => {
				beforeEach(done => {
					__private.lastBlock = null;
					done();
				});
				it('should return false', async () =>
					expect(blocksInstance.lastReceipt.isStale()).to.be.true);
			});
			describe('when __private.lastReceipt is set', () => {
				describe('when secondsAgo > BLOCK_RECEIPT_TIMEOUT', () => {
					beforeEach(done => {
						__private.lastReceipt = dummyLastReceipt;
						done();
					});
					it('should return true', async () =>
						expect(blocksInstance.lastReceipt.isStale()).to.be.true);
				});
				describe('when secondsAgo <= BLOCK_RECEIPT_TIMEOUT', () => {
					beforeEach(done => {
						__private.lastReceipt = Math.floor(Date.now() / 1000) + 10000;
						done();
					});
					it('should return false', async () =>
						expect(blocksInstance.lastReceipt.isStale()).to.be.false);
				});
			});
		});
	});

	describe('isActive', () => {
		beforeEach(done => {
			__private.isActive = false;
			done();
		});
		describe('get', () => {
			it('should return __private.isActive', async () =>
				expect(blocksInstance.isActive.get()).to.be.false);
		});
		describe('set', () => {
			it('should assign input parameter block to __private.isActive and return input parameter', async () => {
				expect(blocksInstance.isActive.set(true)).to.be.true;
				return expect(__private.isActive).to.be.true;
			});
		});
	});

	describe('isCleaning', () => {
		beforeEach(done => {
			__private.cleanup = false;
			done();
		});
		describe('get', () => {
			it('should return __private.cleanup', async () =>
				expect(blocksInstance.isCleaning.get()).to.be.false);
		});
	});

	describe('onBind', () => {
		it('should set __private.loaded = true', async () => {
			const onBindScope = {};
			blocksInstance.onBind(onBindScope);
			return expect(__private.loaded).to.be.true;
		});
	});

	describe('onNewBlock', () => {
		const block = { id: 123, transactions: [{ type: 0, amount: 1 }] };

		describe('when cache is enabled', () => {
			beforeEach(done => {
				blocksInstance = new Blocks(async err => {
					expect(err).to.be.undefined;
					await blocksInstance.onNewBlock(block);
					done();
				}, scope);
			});

			it('should call library.channel.publish with "chain:blocks:change" and block data', async () => {
				expect(library.channel.publish).to.be.calledWith(
					'chain:blocks:change',
					block
				);
			});

			it('should call library.channel.publish with "chain:transactions:confirmed:change" when transactions is not empty', async () => {
				expect(library.channel.publish).to.be.calledWith(
					'chain:transactions:confirmed:change',
					block.transactions
				);
				expect(library.channel.publish).to.be.calledWith(
					'chain:blocks:change',
					block
				);
			});
		});

		describe('when cache is not enabled', () => {
			beforeEach(done => {
				blocksInstance = new Blocks(err => {
					expect(err).to.be.undefined;
					blocksInstance.onNewBlock(block);
					done();
				}, scope);
			});

			it('should call library.channel.publish with "chain:blocks:change" and block data', async () => {
				expect(library.channel.publish).to.be.calledWith(
					'chain:blocks:change',
					block
				);
			});
		});
	});

	describe('cleanup', () => {
		afterEach(() => {
			expect(__private.loaded).to.be.false;
			return expect(__private.cleanup).to.be.true;
		});
		describe('when __private.isActive = false', () => {
			beforeEach(done => {
				__private.isActive = false;
				done();
			});
			it('should call callback', async () => {
				await blocksInstance.cleanup();
			});
		});

		describe('when __private.isActive = true', () => {
			beforeEach(done => {
				__private.isActive = true;
				done();
			});
			describe('after 10 seconds', () => {
				afterEach(() => {
					expect(loggerStub.info.callCount).to.equal(1);
					return expect(loggerStub.info.args[0][0]).to.equal(
						'Waiting for block processing to finish...'
					);
				});
				it('should log info "Waiting for block processing to finish..."', async () => {
					setTimeout(() => {
						__private.isActive = false;
					}, 5000);
					await blocksInstance.cleanup();
				});
			});

			describe('after 20 seconds', () => {
				afterEach(() => {
					expect(loggerStub.info.callCount).to.equal(2);
					expect(loggerStub.info.args[0][0]).to.equal(
						'Waiting for block processing to finish...'
					);
					return expect(loggerStub.info.args[1][0]).to.equal(
						'Waiting for block processing to finish...'
					);
				});
				it('should log info "Waiting for block processing to finish..." 2 times', async () => {
					setTimeout(() => {
						__private.isActive = false;
					}, 15000);
					await blocksInstance.cleanup();
				});
			});
		});
	});

	describe('isLoaded', () => {
		beforeEach(done => {
			__private.loaded = true;
			done();
		});
		it('should return __private.loaded', async () => {
			const isLoadedScope = {};
			blocksInstance.onBind(isLoadedScope);
			return expect(__private.loaded).to.be.true;
		});
	});

	describe('calculateNewBroadhash()', () => {
		describe('when there is a problem getting blocks from the db', () => {
			beforeEach(async () => {
				storageStub.entities.Block.get.rejects(new Error('error'));
			});

			it('should throw an error', async () => {
				const error = await blocksInstance.calculateNewBroadhash();
				expect(error).to.be.an('error');
				expect(error.message).to.equal('error');
			});

			it('should print a log with the error message', async () => {
				const error = await blocksInstance.calculateNewBroadhash();
				expect(loggerStub.error).to.be.calledOnce;
				expect(loggerStub.error).to.be.calledWith(error.stack);
			});
		});
		describe('when there is just a single block', () => {
			const blocks = [
				{
					id: '00000002',
					height: 2,
				},
			];

			beforeEach(async () => {
				storageStub.entities.Block.get.resolves(blocks);
			});

			it('should return broadhash equal to nethash and same height', async () => {
				const {
					broadhash,
					height,
				} = await blocksInstance.calculateNewBroadhash();
				expect(broadhash).to.equal(applicationStateStub.nethash);
				expect(height).to.equal(applicationStateStub.height);
			});
		});

		describe('when there are more than one block', () => {
			const blocks = [
				{
					id: '00000002',
					height: 2,
				},
				{
					id: '00000001',
					height: 1,
				},
			];

			beforeEach(async () => {
				storageStub.entities.Block.get.resolves(blocks);
			});

			it('should return just calculated broadhash and best height', async () => {
				const {
					broadhash,
					height,
				} = await blocksInstance.calculateNewBroadhash();
				const seed = blocks.map(row => row.id).join('');
				const newBroadhash = crypto
					.createHash('sha256')
					.update(seed, 'utf8')
					.digest()
					.toString('hex');
				expect(broadhash).to.equal(newBroadhash);
				expect(height).to.equal(blocks[0].height);
			});
		});
	});

	describe('receiveBlockFromNetwork', () => {
		let tempReceiveBlock;
		let tempReceiveForkOne;
		let tempReceiveForkFive;

		beforeEach(done => {
			tempReceiveBlock = __private.receiveBlock;
			tempReceiveForkOne = __private.receiveForkOne;
			tempReceiveForkFive = __private.receiveForkFive;
			done();
		});

		afterEach(done => {
			__private.receiveBlock = tempReceiveBlock;
			__private.receiveForkOne = tempReceiveForkOne;
			__private.receiveForkFive = tempReceiveForkFive;
			done();
		});

		describe('client ready to receive block', () => {
			afterEach(
				async () => expect(modules.blocks.lastBlock.get.calledOnce).to.be.true
			);

			describe('when block.previousBlock === lastBlock.id && lastBlock.height + 1 === block.height', () => {
				beforeEach(done => {
					__private.receiveBlock = sinonSandbox
						.stub()
						.callsArgWith(1, null, true);
					done();
				});

				afterEach(
					async () => expect(__private.receiveBlock.calledOnce).to.be.true
				);

				it('should call __private.receiveBlock', done => {
					library.sequence.add = function(cb) {
						const fn = Promise.promisify(cb);
						fn().then(() => {
							done();
						});
					};
					blocksProcessModule.receiveBlockFromNetwork({
						id: 5,
						previousBlock: '2',
						height: 3,
					});
				});
			});

			describe('when block.previousBlock !== lastBlock.id && lastBlock.height + 1 === block.height', () => {
				beforeEach(done => {
					__private.receiveForkOne = sinonSandbox
						.stub()
						.callsArgWith(2, null, true);
					done();
				});

				afterEach(() => {
					expect(__private.receiveForkOne.calledOnce).to.be.true;
					expect(__private.receiveForkOne.args[0][0]).to.deep.equal({
						id: 5,
						previousBlock: '3',
						height: 3,
					});
					expect(__private.receiveForkOne.args[0][1]).to.deep.equal({
						id: '2',
						height: 2,
					});
					return expect(__private.receiveForkOne.args[0][2]).to.be.an(
						'function'
					);
				});

				it('should call __private.receiveForkOne', done => {
					library.sequence.add = function(cb) {
						const fn = Promise.promisify(cb);
						fn().then(() => {
							done();
						});
					};
					blocksProcessModule.receiveBlockFromNetwork({
						id: 5,
						previousBlock: '3',
						height: 3,
					});
				});
			});

			describe('when block.previousBlock === lastBlock.previousBlock && block.height === lastBlock.height && block.id !== lastBlock.id', () => {
				beforeEach(() => {
					__private.receiveForkFive = sinonSandbox
						.stub()
						.callsArgWith(2, null, true);
					return modules.blocks.lastBlock.get.returns({
						id: '2',
						height: 2,
						previousBlock: '1',
					});
				});

				afterEach(() => {
					expect(__private.receiveForkFive.calledOnce).to.be.true;
					expect(__private.receiveForkFive.args[0][0]).to.deep.equal({
						id: 5,
						previousBlock: '1',
						height: 2,
					});
					expect(__private.receiveForkFive.args[0][1]).to.deep.equal({
						id: '2',
						previousBlock: '1',
						height: 2,
					});
					return expect(__private.receiveForkFive.args[0][2]).to.be.an(
						'function'
					);
				});

				it('should call __private.receiveForkFive', done => {
					library.sequence.add = function(cb) {
						const fn = Promise.promisify(cb);
						fn().then(() => {
							done();
						});
					};
					blocksProcessModule.receiveBlockFromNetwork({
						id: 5,
						previousBlock: '1',
						height: 2,
					});
				});
			});

			describe('when block.id === lastBlock.id', () => {
				afterEach(done => {
					expect(loggerStub.debug.args[0][0]).to.equal(
						'Block already processed'
					);
					expect(loggerStub.debug.args[0][1]).to.equal('2');
					done();
				});

				it('should log debug message and call a callback', done => {
					library.sequence.add = function(cb) {
						const fn = Promise.promisify(cb);
						fn().then(() => {
							done();
						});
					};
					blocksProcessModule.receiveBlockFromNetwork({
						id: '2',
						previousBlock: '1',
						height: 2,
					});
				});
			});

			describe('when block.id !== lastBlock.id', () => {
				afterEach(() =>
					expect(loggerStub.warn.args[0][0]).to.equal(
						'Discarded block that does not match with current chain: 7 height: 11 round: 1 slot: 544076 generator: a1'
					)
				);

				it('should discard block, when it does not match with current chain', done => {
					library.sequence.add = function(cb) {
						const fn = Promise.promisify(cb);
						fn().then(() => {
							done();
						});
					};
					blocksProcessModule.receiveBlockFromNetwork({
						id: '7',
						previousBlock: '6',
						height: 11,
						timestamp: 5440768,
						generatorPublicKey: 'a1',
					});
				});
			});
		});
	});
});
