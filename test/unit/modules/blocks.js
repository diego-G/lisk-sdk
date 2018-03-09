/* eslint-disable mocha/no-pending-tests */
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
const constants = require('../../../helpers/constants.js');

const Blocks = rewire('../../../modules/blocks.js');

describe('blocks', () => {
	let blocksInstance;
	let self;
	let library;
	let __private;
	let dbStub;
	let loggerStub;
	let logicBlockStub;
	let logicTransactionStub;
	let schemaStub;
	let dbSequenceStub;
	let sequenceStub;
	let peersStub;
	let dummyGenesisblock;
	let accountStub;
	let busStub;
	let balancesSequenceStub;
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
		dbStub = {
			blocks: {
				getGenesisBlockId: sinonSandbox
					.stub()
					.resolves([{ id: '6524861224470851795' }]),
				deleteBlock: sinonSandbox.stub(),
				deleteAfterBlock: sinonSandbox.stub(),
			},
			tx: sinonSandbox.stub(),
		};
		logicBlockStub = sinonSandbox.stub();
		logicTransactionStub = sinonSandbox.stub();
		schemaStub = sinonSandbox.stub();
		dbSequenceStub = sinonSandbox.stub();
		sequenceStub = sinonSandbox.stub();
		accountStub = sinonSandbox.stub();
		busStub = sinonSandbox.stub();
		balancesSequenceStub = sinonSandbox.stub();
		scope = {
			logger: loggerStub,
			db: dbStub,
			logic: {
				account: accountStub,
				block: logicBlockStub,
				transaction: logicTransactionStub,
				peers: peersStub,
			},
			schema: schemaStub,
			dbSequence: dbSequenceStub,
			sequence: sequenceStub,
			genesisblock: dummyGenesisblock,
			bus: busStub,
			balancesSequence: balancesSequenceStub,
		};

		blocksInstance = new Blocks((err, cbSelf) => {
			self = cbSelf;
			library = Blocks.__get__('library');
			__private = Blocks.__get__('__private');
			expect(err).to.be.undefined;
			done();
		}, scope);
	});
	afterEach(done => {
		sinonSandbox.restore();
		done();
	});
	describe('constructor', () => {
		it('should assign params to library', () => {
			return expect(library.logger).to.eql(loggerStub);
		});

		it('should instanciate submodules', () => {
			expect(self.submodules.api).to.be.an('object');
			expect(self.submodules.chain).to.be.an('object');
			expect(self.submodules.process).to.be.an('object');
			expect(self.submodules.utils).to.be.an('object');
			return expect(self.submodules.verify).to.be.an('object');
		});

		it('should assign submodules to this', () => {
			expect(self.submodules.api).to.deep.equal(self.shared);
			expect(self.submodules.chain).to.deep.equal(self.chain);
			expect(self.submodules.process).to.deep.equal(self.process);
			expect(self.submodules.utils).to.deep.equal(self.utils);
			return expect(self.submodules.verify).to.deep.equal(self.verify);
		});

		it('should call callback with result = self', () => {
			return expect(self.submodules.api).to.be.an('object');
		});

		describe('when this.submodules.chain.saveGenesisBlock fails', () => {
			it('should call callback with error', done => {
				dbStub.blocks.getGenesisBlockId.resolves([]);
				blocksInstance = new Blocks((err, cbSelf) => {
					self = cbSelf;
					library = Blocks.__get__('library');
					__private = Blocks.__get__('__private');
					expect(err).to.equal('Blocks#saveGenesisBlock error');
					expect(self.submodules.api).to.be.an('object');
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
			it('should return __private.lastBlock', () => {
				return expect(blocksInstance.lastBlock.get()).to.deep.equal(
					dummyGenesisblock
				);
			});
		});
		describe('set', () => {
			it('should assign input parameter block to __private.lastBlock and return input parameter', () => {
				expect(blocksInstance.lastBlock.set({ id: 2 })).to.deep.equal({
					id: 2,
				});
				return expect(__private.lastBlock).to.deep.equal({ id: 2 });
			});
		});
		describe('isFresh', () => {
			describe('when __private.lastBlock is undefined', () => {
				beforeEach(done => {
					__private.lastBlock = undefined;
					done();
				});
				it('should return false', () => {
					return expect(blocksInstance.lastBlock.isFresh()).to.be.false;
				});
			});
			describe('when __private.lastBlock is set', () => {
				describe('when secondsAgo < constants.blockReceiptTimeOut', () => {
					beforeEach(done => {
						const timestamp =
							10000 +
							Math.floor(Date.now() / 1000) -
							Math.floor(constants.epochTime / 1000);
						__private.lastBlock = { timestamp };
						done();
					});
					it('should return true', () => {
						return expect(blocksInstance.lastBlock.isFresh()).to.be.true;
					});
				});
				describe('when secondsAgo >= constants.blockReceiptTimeOut', () => {
					beforeEach(done => {
						__private.lastBlock = { timestamp: 555555 };
						done();
					});
					it('should return false', () => {
						return expect(blocksInstance.lastBlock.isFresh()).to.be.false;
					});
				});
			});
		});
	});

	describe('lastReciept', () => {
		it('should assign get');

		it('should assign update');

		it('should assign isStale');
	});

	describe('isActive', () => {
		it('should assign get');

		it('should assign set');
	});

	describe('isCleaning', () => {
		it('should assign get');
	});

	describe('onBind', () => {
		it('should set __private.loaded = true');
	});

	describe('cleanup', () => {
		it('should set __private.loaded = false');

		it('should set __private.cleanup = true');

		describe('when __private.isActive = false', () => {
			it('should call callback');
		});

		describe('when __private.isActive = true', () => {
			describe('after 10 seconds', () => {
				it(
					'should call library.logger.info with "Waiting for block processing to finish..."'
				);
			});

			describe('after 100 seconds', () => {
				it(
					'should call library.logger.info with "Waiting for block processing to finish..." 10 times'
				);
			});
		});
	});

	describe('isLoaded', () => {
		it('should return __private.loaded');
	});
});
