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
const Promise = require('bluebird');
const Bignum = require('../../../helpers/bignum.js');

const Round = rewire('../../../logic/round.js');
const genesisBlock = __testContext.config.genesisBlock;

const { ACTIVE_DELEGATES } = global.constants;

describe('round', () => {
	let scope;
	let round;
	let dbStub;
	let storageStub;
	let validScope;

	before(async () => {
		dbStub = {
			rounds: {
				updateMissedBlocks: sinonSandbox.stub(),
				updateVotes: sinonSandbox.stub(),
				updateDelegatesRanks: sinonSandbox.stub(),
				restoreRoundSnapshot: sinonSandbox.stub(),
				restoreVotesSnapshot: sinonSandbox.stub(),
				checkSnapshotAvailability: sinonSandbox.stub(),
				countRoundSnapshot: sinonSandbox.stub(),
				deleteRoundRewards: sinonSandbox.stub(),
				insertRoundRewards: sinonSandbox.stub(),
			},
		};

		dbStub.task = sinonSandbox.stub().yields(dbStub);
		dbStub.batch = (...args) => {
			return Promise.all(_.flatten(args));
		};

		storageStub = {
			entities: {
				Round: {
					delete: sinonSandbox.stub().resolves('success'),
					getTotalVotedAmount: sinonSandbox.stub().resolves('success'),
				},
			},
		};

		validScope = {
			backwards: false,
			round: 1,
			roundOutsiders: [],
			roundDelegates: [genesisBlock.generatorPublicKey],
			roundFees: ACTIVE_DELEGATES,
			roundRewards: [10],
			library: {
				db: dbStub,
				storage: storageStub,
				logger: {
					trace: sinonSandbox.spy(),
					debug: sinonSandbox.spy(),
					info: sinonSandbox.spy(),
					log: sinonSandbox.spy(),
					warn: sinonSandbox.spy(),
					error: sinonSandbox.spy(),
				},
			},
			modules: {
				accounts: {
					mergeAccountAndGet: sinonSandbox.stub(),
				},
			},
			block: {
				generatorPublicKey: genesisBlock.generatorPublicKey,
				id: genesisBlock.id,
				height: 1,
				timestamp: 100,
			},
		};
	});

	beforeEach(async () => {
		scope = _.cloneDeep(validScope);
		round = new Round(_.cloneDeep(scope), dbStub);
	});

	afterEach(async () => {
		dbStub.rounds.updateVotes.reset();
		dbStub.rounds.updateDelegatesRanks.reset();
		dbStub.rounds.restoreRoundSnapshot.reset();
		dbStub.rounds.restoreVotesSnapshot.reset();
		dbStub.rounds.checkSnapshotAvailability.reset();
		dbStub.rounds.countRoundSnapshot.reset();
		dbStub.rounds.deleteRoundRewards.reset();
		dbStub.rounds.insertRoundRewards.reset();
		dbStub.rounds.updateMissedBlocks.reset();

		storageStub.entities.Round.delete.reset();
		storageStub.entities.Round.getTotalVotedAmount.reset();
		scope.modules.accounts.mergeAccountAndGet.reset();
		sinonSandbox.restore();
	});

	function isPromise(obj) {
		return typeof obj.then === 'function';
	}

	describe('constructor', () => {
		describe('when calling with required properties', () => {
			it('should return Round instance', () => {
				return expect(round).to.be.instanceof(Round);
			});

			it('should set scope', () => {
				return expect(round.scope).to.be.eql(validScope);
			});

			it('should set t', () => {
				return expect(round.t).to.be.eql(dbStub);
			});
		});

		describe('when calling with missing properties', () => {
			describe('round', () => {
				it('should throw', done => {
					const property = 'round';
					delete scope[property];
					try {
						round = new Round(_.cloneDeep(scope), dbStub);
					} catch (err) {
						expect(err).to.equal(
							`Missing required scope property: ${property}`
						);
					}
					done();
				});
			});

			describe('backwards', () => {
				it('should throw', done => {
					const property = 'backwards';
					delete scope[property];
					try {
						round = new Round(_.cloneDeep(scope), dbStub);
					} catch (err) {
						expect(err).to.equal(
							`Missing required scope property: ${property}`
						);
					}
					done();
				});
			});

			describe('when finish round', () => {
				beforeEach(done => {
					// Set finishRound, so now we need additional properties
					scope.finishRound = true;
					done();
				});

				describe('roundFees', () => {
					it('should throw', done => {
						const property = 'roundFees';
						delete scope[property];
						try {
							round = new Round(_.cloneDeep(scope), dbStub);
						} catch (err) {
							expect(err).to.equal(
								`Missing required scope property: ${property}`
							);
						}
						done();
					});
				});

				describe('roundRewards', () => {
					it('should throw', done => {
						const property = 'roundRewards';
						delete scope[property];
						try {
							round = new Round(_.cloneDeep(scope), dbStub);
						} catch (err) {
							expect(err).to.equal(
								`Missing required scope property: ${property}`
							);
						}
						done();
					});
				});

				describe('roundDelegates', () => {
					it('should throw', done => {
						const property = 'roundDelegates';
						delete scope[property];
						try {
							round = new Round(_.cloneDeep(scope), dbStub);
						} catch (err) {
							expect(err).to.equal(
								`Missing required scope property: ${property}`
							);
						}
						done();
					});
				});

				describe('roundOutsiders', () => {
					it('should throw', done => {
						const property = 'roundOutsiders';
						delete scope[property];
						try {
							round = new Round(_.cloneDeep(scope), dbStub);
						} catch (err) {
							expect(err).to.equal(
								`Missing required scope property: ${property}`
							);
						}
						done();
					});
				});
			});
		});
	});

	describe('mergeBlockGenerator', () => {
		describe('when going forward', () => {
			let args = null;

			beforeEach(() => {
				scope.backwards = false;
				round = new Round(_.cloneDeep(scope), dbStub);
				args = {
					producedBlocks: 1,
					publicKey: scope.block.generatorPublicKey,
					round: scope.round,
				};
				scope.modules.accounts.mergeAccountAndGet.callsArgWith(1, null, args);
				return round.mergeBlockGenerator();
			});

			it('should call modules.accounts.mergeAccountAndGet with proper params', () => {
				return expect(
					round.scope.modules.accounts.mergeAccountAndGet
				).to.be.calledWith(args);
			});
		});

		describe('when going backwards', () => {
			let args = null;

			beforeEach(() => {
				scope.backwards = true;
				round = new Round(_.cloneDeep(scope), dbStub);
				args = {
					producedBlocks: -1,
					publicKey: scope.block.generatorPublicKey,
					round: scope.round,
				};
				scope.modules.accounts.mergeAccountAndGet.callsArgWith(1, null, args);
				return round.mergeBlockGenerator();
			});

			it('should call modules.accounts.mergeAccountAndGet with proper params', () => {
				return expect(
					round.scope.modules.accounts.mergeAccountAndGet
				).to.be.calledWith(args);
			});
		});
	});

	describe('updateMissedBlocks', () => {
		let stub;
		let res;

		describe('when there are no outsiders', () => {
			beforeEach(done => {
				res = round.updateMissedBlocks();
				done();
			});

			it('should return t object', () => {
				expect(res).to.not.be.instanceOf(Promise);
				return expect(res).to.deep.equal(dbStub);
			});
		});

		describe('when there are outsiders', () => {
			beforeEach(done => {
				scope.roundOutsiders = ['abc'];
				round = new Round(_.cloneDeep(scope), dbStub);
				stub = dbStub.rounds.updateMissedBlocks;
				stub
					.withArgs(scope.backwards, scope.roundOutsiders)
					.resolves('success');
				res = round.updateMissedBlocks();
				done();
			});

			it('should return promise', () => {
				return expect(isPromise(res)).to.be.true;
			});

			it('query should be called with proper args', () => {
				return res.then(response => {
					expect(response).to.equal('success');
					expect(stub.calledWith(scope.backwards, scope.roundOutsiders)).to.be
						.true;
				});
			});
		});
	});

	describe('getVotes', () => {
		let stub;
		let res;

		beforeEach(done => {
			stub = storageStub.entities.Round.getTotalVotedAmount;
			stub.withArgs({ round: scope.round }).resolves('success');
			res = round.getVotes();
			done();
		});

		it('should return promise', () => {
			return expect(isPromise(res)).to.be.true;
		});

		it('query should be called with proper args', () => {
			return res.then(response => {
				expect(response).to.equal('success');
				expect(stub.calledWith({ round: scope.round })).to.be.true;
			});
		});
	});

	describe('updateVotes', () => {
		let getVotes_stub;
		let updateVotes_stub;
		let res;
		let delegate;

		describe('when getVotes returns at least one entry', async () => {
			beforeEach(async () => {
				getVotes_stub = storageStub.entities.Round.getTotalVotedAmount;
				updateVotes_stub = dbStub.rounds.updateVotes;

				delegate = {
					amount: 10000,
					delegate:
						'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
					address: '16010222169256538112L',
				};

				scope.modules.accounts.generateAddressByPublicKey = function() {
					return delegate.address;
				};

				getVotes_stub
					.withArgs({ round: scope.round })
					.resolves([delegate, delegate]);

				updateVotes_stub
					.withArgs(delegate.address, delegate.amount)
					.resolves('QUERY');

				round = new Round(_.cloneDeep(scope), dbStub);
				res = round.updateVotes();
			});

			it('should return promise', () => {
				return expect(isPromise(res)).to.be.true;
			});

			it('getVotes query should be called with proper args', () => {
				return expect(getVotes_stub.calledWith({ round: scope.round })).to.be
					.true;
			});

			it('updateVotes should be called twice', () => {
				return expect(updateVotes_stub.callCount).to.be.eql(2);
			});

			it('updateVotes query should be called with proper args', () => {
				return expect(
					updateVotes_stub.alwaysCalledWith(delegate.address, delegate.amount)
				).to.be.true;
			});

			it('getVotes result should contain 2 queries', () => {
				return res.then(response => {
					expect(response).to.deep.equal(['QUERY', 'QUERY']);
				});
			});
		});

		describe('when getVotes returns no entries', () => {
			beforeEach(async () => {
				scope = _.cloneDeep(validScope);

				delegate = {
					amount: 10000,
					delegate:
						'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
					address: '16010222169256538112L',
				};

				scope.modules.accounts.generateAddressByPublicKey = function() {
					return delegate.address;
				};

				getVotes_stub.withArgs({ round: scope.round }).resolves([]);
				updateVotes_stub.resetHistory();
				updateVotes_stub
					.withArgs(delegate.address, delegate.amount)
					.resolves('QUERY');

				round = new Round(_.cloneDeep(scope), dbStub);
				res = round.updateVotes();
			});

			it('should return promise', () => {
				return expect(isPromise(res)).to.be.true;
			});

			it('getVotes query should be called with proper args', () => {
				return expect(getVotes_stub.calledWith({ round: scope.round })).to.be
					.true;
			});

			it('updateVotes should be not called', () => {
				return expect(updateVotes_stub.called).to.be.false;
			});
		});
	});

	describe('flushRound', () => {
		let stub;
		let res;

		beforeEach(async () => {
			stub = scope.library.storage.entities.Round.delete.resolves('success');
			round = new Round(_.cloneDeep(scope), dbStub);
			res = round.flushRound();
		});

		it('should return promise', () => {
			return expect(isPromise(res)).to.be.true;
		});

		it('query should be called with proper args', async () => {
			const response = await res;
			expect(response).to.equal('success');
			expect(stub).to.be.calledWith({ round: validScope.round });
		});
	});

	describe('updateDelegatesRanks', () => {
		let stub;
		let res;

		beforeEach(done => {
			stub = dbStub.rounds.updateDelegatesRanks;
			stub.resolves('success');

			round = new Round(_.cloneDeep(scope), dbStub);
			res = round.updateDelegatesRanks();
			done();
		});

		it('should return promise', () => {
			return expect(isPromise(res)).to.be.true;
		});

		it('query should be called with proper args', () => {
			return res.then(response => {
				expect(response).to.equal('success');
				expect(stub.calledOnce).to.be.true;
			});
		});
	});

	describe('restoreRoundSnapshot', () => {
		let res;
		let stub;

		beforeEach(done => {
			stub = dbStub.rounds.restoreRoundSnapshot;
			stub.resolves('success');
			res = round.restoreRoundSnapshot();
			done();
		});

		it('should return promise', () => {
			return expect(isPromise(res)).to.be.true;
		});

		it('query should be called with no args', () => {
			return res.then(response => {
				expect(response).to.equal('success');
				expect(stub.calledWith()).to.be.true;
			});
		});
	});

	describe('restoreVotesSnapshot', () => {
		let stub;
		let res;

		beforeEach(done => {
			stub = dbStub.rounds.restoreVotesSnapshot;
			stub.withArgs().resolves('success');
			res = round.restoreVotesSnapshot();
			done();
		});

		it('should return promise', () => {
			return expect(isPromise(res)).to.be.true;
		});

		it('query should be called with no args', () => {
			return res.then(response => {
				expect(response).to.equal('success');
				expect(stub.calledWith()).to.be.true;
			});
		});
	});

	describe('checkSnapshotAvailability', () => {
		const stubs = {};
		let res;

		beforeEach(done => {
			// Init stubs and scope
			stubs.checkSnapshotAvailability = dbStub.rounds.checkSnapshotAvailability;
			stubs.countRoundSnapshot = dbStub.rounds.countRoundSnapshot;
			done();
		});

		it('should return promise', () => {
			stubs.checkSnapshotAvailability.resolves();
			stubs.countRoundSnapshot.resolves();
			scope.round = 1;
			round = new Round(_.cloneDeep(scope), dbStub);
			res = round.checkSnapshotAvailability();

			return expect(isPromise(res)).to.be.true;
		});

		it('should resolve without any error when checkSnapshotAvailability query returns 1', () => {
			stubs.checkSnapshotAvailability.withArgs(1).resolves(1);
			scope.round = 1;
			round = new Round(_.cloneDeep(scope), dbStub);
			res = round.checkSnapshotAvailability();

			return res.then(() => {
				expect(stubs.checkSnapshotAvailability).to.have.been.calledWith(1);
				return expect(stubs.countRoundSnapshot.called).to.be.false;
			});
		});

		it('should resolve without any error when checkSnapshotAvailability query returns null and table is empty', () => {
			stubs.checkSnapshotAvailability.withArgs(2).resolves(null);
			stubs.countRoundSnapshot.resolves(0);
			scope.round = 2;
			round = new Round(_.cloneDeep(scope), dbStub);
			res = round.checkSnapshotAvailability();

			return res.then(() => {
				expect(stubs.checkSnapshotAvailability).to.have.been.calledWith(2);
				return expect(stubs.countRoundSnapshot.called).to.be.true;
			});
		});

		it('should be rejected with proper error when checkSnapshotAvailability query returns null and table is not empty', () => {
			stubs.checkSnapshotAvailability.withArgs(2).resolves(null);
			stubs.countRoundSnapshot.resolves(1);
			scope.round = 2;
			round = new Round(_.cloneDeep(scope), dbStub);
			res = round.checkSnapshotAvailability();

			return expect(res).to.eventually.be.rejectedWith(
				'Snapshot for round 2 not available'
			);
		});
	});

	describe('deleteRoundRewards', () => {
		let stub;
		let res;

		beforeEach(done => {
			stub = dbStub.rounds.deleteRoundRewards;
			stub.withArgs(validScope.round).resolves('success');
			round = new Round(_.cloneDeep(scope), dbStub);
			res = round.deleteRoundRewards();
			done();
		});

		it('should return promise', () => {
			return expect(isPromise(res)).to.be.true;
		});

		it('query should be called with no args', () => {
			return res.then(response => {
				expect(response).to.equal('success');
				expect(stub).to.have.been.calledWith(validScope.round);
			});
		});
	});

	describe('applyRound', () => {
		let res;
		let insertRoundRewards_stub;

		function sumChanges(forward, backwards) {
			const results = {};
			forward.forEach(response => {
				if (results[response.publicKey]) {
					results[response.publicKey].balance += response.balance || 0;
					results[response.publicKey].u_balance += response.u_balance || 0;
					results[response.publicKey].rewards += response.rewards || 0;
					results[response.publicKey].fees += response.fees || 0;
				} else {
					results[response.publicKey] = {
						balance: response.balance || 0,
						u_balance: response.u_balance || 0,
						rewards: response.rewards || 0,
						fees: response.fees || 0,
					};
				}
			});
			backwards.forEach(response => {
				if (results[response.publicKey]) {
					results[response.publicKey].balance += response.balance || 0;
					results[response.publicKey].u_balance += response.u_balance || 0;
					results[response.publicKey].rewards += response.rewards || 0;
					results[response.publicKey].fees += response.fees || 0;
				} else {
					results[response.publicKey] = {
						balance: response.balance || 0,
						u_balance: response.u_balance || 0,
						rewards: response.rewards || 0,
						fees: response.fees || 0,
					};
				}
			});
			return results;
		}

		describe('with only one delegate', () => {
			describe('when there are no remaining fees', () => {
				const forwardResults = [];
				const backwardsResults = [];
				let batch_stub;

				beforeEach(done => {
					scope.roundDelegates = [genesisBlock.generatorPublicKey];
					scope.roundFees = ACTIVE_DELEGATES; // 1 LSK fee per delegate, no remaining fees
					batch_stub = sinonSandbox.stub(dbStub, 'batch').resolves('success');
					done();
				});

				afterEach(async () => {
					round.scope.modules.accounts.mergeAccountAndGet.resetHistory();
					batch_stub.restore();
				});

				describe('forward', () => {
					let called = 0;

					beforeEach(async () => {
						insertRoundRewards_stub = dbStub.rounds.insertRoundRewards;
						insertRoundRewards_stub.resolves('success');
						scope.backwards = false;
						round = new Round(_.cloneDeep(scope), dbStub);
						res = round.applyRound();
					});

					it('query should be called', () => {
						return res.then(response => {
							expect(response).to.equal('success');
							expect(batch_stub.called).to.be.true;
						});
					});

					it('should call mergeAccountAndGet with proper args (apply rewards)', () => {
						const index = 0; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							u_balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.be.eql(args);
					});

					it('should not call mergeAccountAndGet another time (for apply remaining fees)', () => {
						return expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called);
					});

					it('should call insertRoundRewards with proper args', () => {
						return expect(insertRoundRewards_stub).to.have.been.calledWith(
							validScope.block.timestamp,
							forwardResults[0].fees.toString(),
							forwardResults[0].rewards.toString(),
							validScope.round,
							forwardResults[0].publicKey
						);
					});
				});

				describe('backwards', () => {
					let called = 0;

					beforeEach(async () => {
						round.scope.modules.accounts.mergeAccountAndGet.resetHistory();
						insertRoundRewards_stub = dbStub.rounds.insertRoundRewards;
						insertRoundRewards_stub.resolves('success');
						scope.backwards = true;
						round = new Round(_.cloneDeep(scope), dbStub);
						res = round.applyRound();
					});

					it('query should be called', () => {
						return res.then(response => {
							expect(response).to.equal('success');
							expect(batch_stub.called).to.be.true;
						});
					});

					it('should call mergeAccountAndGet with proper args (apply rewards)', () => {
						const index = 0; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(validScope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(validScope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(validScope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: validScope.roundDelegates[index],
							balance: -balancePerDelegate,
							u_balance: -balancePerDelegate,
							round: validScope.round,
							fees: -feesPerDelegate,
							rewards: -validScope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (for apply remaining fees)', () => {
						return expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called);
					});

					it('should not call insertRoundRewards', () => {
						return expect(insertRoundRewards_stub).to.have.not.been.called;
					});
				});

				describe('consistency checks for each delegate', () => {
					let result;

					before(done => {
						result = sumChanges(forwardResults, backwardsResults);
						done();
					});

					it('balance should sum to 0', () => {
						return _.each(result, response => {
							expect(response.balance).to.equal(0);
						});
					});

					it('u_balance should sum to 0', () => {
						return _.each(result, response => {
							expect(response.u_balance).to.equal(0);
						});
					});

					it('fees should sum to 0', () => {
						return _.each(result, response => {
							expect(response.fees).to.equal(0);
						});
					});

					it('rewards should sum to 0', () => {
						return _.each(result, response => {
							expect(response.rewards).to.equal(0);
						});
					});
				});
			});

			describe('when there are remaining fees', () => {
				const forwardResults = [];
				const backwardsResults = [];
				let batch_stub;

				beforeEach(done => {
					scope.roundDelegates = [genesisBlock.generatorPublicKey];
					scope.roundFees = 100; // 0 LSK fee per delegate, 100 remaining fees
					batch_stub = sinonSandbox.stub(dbStub, 'batch').resolves('success');
					done();
				});

				afterEach(async () => {
					round.scope.modules.accounts.mergeAccountAndGet.reset();
					batch_stub.restore();
				});

				describe('forward', () => {
					let called = 0;

					beforeEach(async () => {
						insertRoundRewards_stub = dbStub.rounds.insertRoundRewards;
						insertRoundRewards_stub.resolves('success');
						scope.backwards = false;
						round = new Round(_.cloneDeep(scope), dbStub);
						res = round.applyRound();
					});

					it('query should be called', () => {
						return res.then(response => {
							expect(response).to.equal('success');
							expect(batch_stub.called).to.be.true;
						});
					});

					it('should call mergeAccountAndGet with proper args (apply rewards)', () => {
						const index = 0; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							u_balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (fees)', () => {
						const index = 0; // Delegate index on list
						const feesPerDelegate = new Bignum(scope.roundFees.toPrecision(15))
							.dividedBy(ACTIVE_DELEGATES)
							.integerValue(Bignum.ROUND_FLOOR);
						const remainingFees = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.minus(feesPerDelegate.multipliedBy(ACTIVE_DELEGATES))
								.toFixed()
						);

						const args = {
							publicKey: scope.roundDelegates[index], // Remaining fees are applied to last delegate of round
							balance: remainingFees,
							u_balance: remainingFees,
							round: scope.round,
							fees: remainingFees,
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (completed)', () => {
						return expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called);
					});

					it('should call insertRoundRewards with proper args', () => {
						return expect(insertRoundRewards_stub).to.have.been.calledWith(
							validScope.block.timestamp,
							(forwardResults[0].fees + forwardResults[1].fees).toString(),
							forwardResults[0].rewards.toString(),
							validScope.round,
							forwardResults[0].publicKey
						);
					});
				});

				describe('backwards', () => {
					let called = 0;

					beforeEach(async () => {
						insertRoundRewards_stub = dbStub.rounds.insertRoundRewards;
						insertRoundRewards_stub.resolves('success');
						scope.backwards = true;
						round = new Round(_.cloneDeep(scope), dbStub);
						res = round.applyRound();
					});

					it('query should be called', () => {
						return res.then(response => {
							expect(response).to.equal('success');
							expect(batch_stub.called).to.be.true;
						});
					});

					it('should call mergeAccountAndGet with proper args (apply rewards)', () => {
						const index = 0; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							u_balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (fees)', () => {
						const index = 0; // Delegate index on list
						const feesPerDelegate = new Bignum(scope.roundFees.toPrecision(15))
							.dividedBy(ACTIVE_DELEGATES)
							.integerValue(Bignum.ROUND_FLOOR);
						const remainingFees = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.minus(feesPerDelegate.multipliedBy(ACTIVE_DELEGATES))
								.toFixed()
						);

						const args = {
							publicKey: scope.roundDelegates[index], // Remaining fees are applied to last delegate of round
							balance: -remainingFees,
							u_balance: -remainingFees,
							round: scope.round,
							fees: -remainingFees,
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (completed)', () => {
						return expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called);
					});

					it('should not call insertRoundRewards', () => {
						return expect(insertRoundRewards_stub).to.have.not.been.called;
					});
				});

				describe('consistency checks for each delegate', () => {
					let result;

					before(done => {
						result = sumChanges(forwardResults, backwardsResults);
						done();
					});

					it('balance should sum to 0', () => {
						return _.each(result, response => {
							expect(response.balance).to.equal(0);
						});
					});

					it('u_balance should sum to 0', () => {
						return _.each(result, response => {
							expect(response.u_balance).to.equal(0);
						});
					});

					it('fees should sum to 0', () => {
						return _.each(result, response => {
							expect(response.fees).to.equal(0);
						});
					});

					it('rewards should sum to 0', () => {
						return _.each(result, response => {
							expect(response.rewards).to.equal(0);
						});
					});
				});
			});
		});

		describe('with 3 delegates', () => {
			describe('when there are no remaining fees', () => {
				const forwardResults = [];
				const backwardsResults = [];
				let batch_stub;

				beforeEach(done => {
					scope.roundDelegates = [
						'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
						'968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b',
						'380b952cd92f11257b71cce73f51df5e0a258e54f60bb82bccd2ba8b4dff2ec9',
					];
					scope.roundRewards = [1, 2, 3];
					scope.roundFees = ACTIVE_DELEGATES; // 1 LSK fee per delegate, no remaining fees
					batch_stub = sinonSandbox.stub(dbStub, 'batch').resolves('success');
					done();
				});

				afterEach(async () => {
					round.scope.modules.accounts.mergeAccountAndGet.resetHistory();
					batch_stub.restore();
				});

				describe('forward', () => {
					let called = 0;

					beforeEach(async () => {
						insertRoundRewards_stub = dbStub.rounds.insertRoundRewards;
						insertRoundRewards_stub.resolves('success');
						scope.backwards = false;
						round = new Round(_.cloneDeep(scope), dbStub);
						res = round.applyRound();
					});

					it('query should be called', () => {
						return res.then(response => {
							expect(response).to.equal('success');
							expect(batch_stub.called).to.be.true;
						});
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 1st delegate', () => {
						const index = 0; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							u_balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 2nd delegate', () => {
						const index = 1; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							u_balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 3th delegate', () => {
						const index = 2; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							u_balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (for applying remaining fees)', () => {
						return expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called);
					});

					it('should call insertRoundRewards with proper args', () => {
						expect(insertRoundRewards_stub).to.have.been.calledWith(
							validScope.block.timestamp,
							forwardResults[0].fees.toString(),
							forwardResults[0].rewards.toString(),
							validScope.round,
							forwardResults[0].publicKey
						);
						expect(insertRoundRewards_stub).to.have.been.calledWith(
							validScope.block.timestamp,
							forwardResults[1].fees.toString(),
							forwardResults[1].rewards.toString(),
							validScope.round,
							forwardResults[1].publicKey
						);
						return expect(insertRoundRewards_stub).to.have.been.calledWith(
							validScope.block.timestamp,
							forwardResults[2].fees.toString(),
							forwardResults[2].rewards.toString(),
							validScope.round,
							forwardResults[2].publicKey
						);
					});
				});

				describe('backwards', () => {
					let called = 0;

					beforeEach(async () => {
						insertRoundRewards_stub = dbStub.rounds.insertRoundRewards;
						insertRoundRewards_stub.resolves('success');
						scope.backwards = true;
						round = new Round(_.cloneDeep(scope), dbStub);
						res = round.applyRound();
						await res;
					});

					it('query should be called', () => {
						return res.then(response => {
							expect(response).to.equal('success');
							expect(batch_stub.called).to.be.true;
						});
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 1st delegate', () => {
						const index = 2; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							u_balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 2nd delegate', () => {
						const index = 1; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							u_balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 3th delegate', () => {
						const index = 0; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							u_balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (for applying remaining fees)', () => {
						return expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called);
					});

					it('should not call insertRoundRewards', () => {
						return expect(insertRoundRewards_stub).to.have.not.been.called;
					});
				});

				describe('consistency checks for each delegate', () => {
					let result;

					before(done => {
						result = sumChanges(forwardResults, backwardsResults);
						done();
					});

					it('balance should sum to 0', () => {
						return _.each(result, response => {
							expect(response.balance).to.equal(0);
						});
					});

					it('u_balance should sum to 0', () => {
						return _.each(result, response => {
							expect(response.u_balance).to.equal(0);
						});
					});

					it('fees should sum to 0', () => {
						return _.each(result, response => {
							expect(response.fees).to.equal(0);
						});
					});

					it('rewards should sum to 0', () => {
						return _.each(result, response => {
							expect(response.rewards).to.equal(0);
						});
					});
				});
			});

			describe('when there are remaining fees', () => {
				const forwardResults = [];
				const backwardsResults = [];
				let batch_stub;

				beforeEach(done => {
					scope.roundDelegates = [
						'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
						'968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b',
						'380b952cd92f11257b71cce73f51df5e0a258e54f60bb82bccd2ba8b4dff2ec9',
					];
					scope.roundRewards = [1, 2, 3];
					scope.roundFees = 1000; // 9 LSK fee per delegate, 91 remaining fees
					batch_stub = sinonSandbox.stub(dbStub, 'batch').resolves('success');
					done();
				});

				afterEach(async () => {
					round.scope.modules.accounts.mergeAccountAndGet.reset();
					batch_stub.restore();
				});

				describe('forward', () => {
					let called = 0;

					beforeEach(async () => {
						insertRoundRewards_stub = dbStub.rounds.insertRoundRewards;
						insertRoundRewards_stub.resolves('success');
						scope.backwards = false;
						round = new Round(_.cloneDeep(scope), dbStub);
						res = round.applyRound();
						await res;
					});

					it('query should be called', () => {
						return res.then(response => {
							expect(response).to.equal('success');
							expect(batch_stub.called).to.be.true;
						});
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 1st delegate', () => {
						const index = 0; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							u_balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 2nd delegate', () => {
						const index = 1; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							u_balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 3th delegate', () => {
						const index = 2; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							u_balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (fees)', () => {
						const index = 2; // Delegate index on list
						const feesPerDelegate = new Bignum(scope.roundFees.toPrecision(15))
							.dividedBy(ACTIVE_DELEGATES)
							.integerValue(Bignum.ROUND_FLOOR);
						const remainingFees = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.minus(feesPerDelegate.multipliedBy(ACTIVE_DELEGATES))
								.toFixed()
						);

						const args = {
							publicKey: scope.roundDelegates[index], // Remaining fees are applied to last delegate of round
							balance: remainingFees,
							u_balance: remainingFees,
							round: scope.round,
							fees: remainingFees,
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (completed)', () => {
						return expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called);
					});

					it('should call insertRoundRewards with proper args', () => {
						expect(insertRoundRewards_stub).to.have.been.calledWith(
							validScope.block.timestamp,
							forwardResults[0].fees.toString(),
							forwardResults[0].rewards.toString(),
							validScope.round,
							forwardResults[0].publicKey
						);
						expect(insertRoundRewards_stub).to.have.been.calledWith(
							validScope.block.timestamp,
							forwardResults[1].fees.toString(),
							forwardResults[1].rewards.toString(),
							validScope.round,
							forwardResults[1].publicKey
						);
						return expect(insertRoundRewards_stub).to.have.been.calledWith(
							validScope.block.timestamp,
							(forwardResults[2].fees + forwardResults[3].fees).toString(),
							forwardResults[2].rewards.toString(),
							validScope.round,
							forwardResults[2].publicKey
						);
					});
				});

				describe('backwards', () => {
					let called = 0;

					beforeEach(async () => {
						insertRoundRewards_stub = dbStub.rounds.insertRoundRewards;
						insertRoundRewards_stub.resolves('success');
						scope.backwards = true;
						round = new Round(_.cloneDeep(scope), dbStub);
						res = round.applyRound();
						await res;
					});

					it('query should be called', () => {
						return res.then(response => {
							expect(response).to.equal('success');
							expect(batch_stub.called).to.be.true;
						});
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 1st delegate', () => {
						const index = 2; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							u_balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 2nd delegate', () => {
						const index = 1; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							u_balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 3th delegate', () => {
						const index = 0; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							u_balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (fees)', () => {
						const index = 2; // Delegate index on list
						const feesPerDelegate = new Bignum(scope.roundFees.toPrecision(15))
							.dividedBy(ACTIVE_DELEGATES)
							.integerValue(Bignum.ROUND_FLOOR);
						const remainingFees = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.minus(feesPerDelegate.multipliedBy(ACTIVE_DELEGATES))
								.toFixed()
						);

						const args = {
							publicKey: scope.roundDelegates[index], // Remaining fees are applied to last delegate of round
							balance: -remainingFees,
							u_balance: -remainingFees,
							round: scope.round,
							fees: -remainingFees,
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (completed)', () => {
						return expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called);
					});

					it('should not call insertRoundRewards', () => {
						return expect(insertRoundRewards_stub).to.have.not.been.called;
					});
				});

				describe('consistency checks for each delegate', () => {
					let result;

					before(done => {
						result = sumChanges(forwardResults, backwardsResults);
						done();
					});

					it('balance should sum to 0', () => {
						return _.each(result, response => {
							expect(response.balance).to.equal(0);
						});
					});

					it('u_balance should sum to 0', () => {
						return _.each(result, response => {
							expect(response.u_balance).to.equal(0);
						});
					});

					it('fees should sum to 0', () => {
						return _.each(result, response => {
							expect(response.fees).to.equal(0);
						});
					});

					it('rewards should sum to 0', () => {
						return _.each(result, response => {
							expect(response.rewards).to.equal(0);
						});
					});
				});
			});
		});
	});

	describe('land', () => {
		let batch_stub; // eslint-disable-line no-unused-vars
		let updateMissedBlocks_stub;
		let updateVotes_stub;
		let getVotes_stub;
		let updateDelegatesRanks_stub;
		let flush_stub;
		let res;

		beforeEach(async () => {
			// Init required properties
			scope.roundOutsiders = ['abc'];
			scope.roundDelegates = [
				'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
				'968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b',
				'380b952cd92f11257b71cce73f51df5e0a258e54f60bb82bccd2ba8b4dff2ec9',
			];
			scope.roundRewards = [1, 2, 3];
			scope.roundFees = 1000; // 9 LSK fee per delegate, 91 remaining fees

			scope.modules.accounts.generateAddressByPublicKey = function() {
				return delegate.address;
			};

			const delegate = {
				amount: 10000,
				delegate:
					'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
				address: '16010222169256538112L',
			};
			batch_stub = sinonSandbox.stub(dbStub, 'batch').resolves();
			updateMissedBlocks_stub = dbStub.rounds.updateMissedBlocks.resolves();
			getVotes_stub = storageStub.entities.Round.getTotalVotedAmount.resolves([
				delegate,
			]);
			updateVotes_stub = dbStub.rounds.updateVotes.resolves('QUERY');
			updateDelegatesRanks_stub = dbStub.rounds.updateDelegatesRanks.resolves();
			flush_stub = validScope.library.storage.entities.Round.delete;

			round = new Round(_.cloneDeep(scope), dbStub);
			res = round.land();
			await res;
		});

		it('should return promise', () => {
			return expect(isPromise(res)).to.be.true;
		});

		it('query getVotes should be called twice', () => {
			// 2x updateVotes which calls 1x getVotes
			return expect(getVotes_stub.callCount).to.be.eql(2);
		});

		it('query updateVotes should be called twice', () => {
			return expect(updateVotes_stub.callCount).to.equal(2);
		});

		it('query updateMissedBlocks should be called once', () => {
			return expect(updateMissedBlocks_stub.callCount).to.equal(1);
		});

		it('query flushRound should be called twice', () => {
			return expect(flush_stub.callCount).to.equal(2);
		});

		it('query updateDelegatesRanks should be called once', () => {
			return expect(updateDelegatesRanks_stub.callCount).to.equal(1);
		});

		it('modules.accounts.mergeAccountAndGet should be called 4 times', () => {
			// 3x delegates + 1x remaining fees
			return expect(
				round.scope.modules.accounts.mergeAccountAndGet.callCount
			).to.equal(4);
		});
	});

	describe('backwardLand', () => {
		let batch_stub; // eslint-disable-line no-unused-vars
		let updateMissedBlocks_stub;
		let updateVotes_stub;
		let getVotes_stub;
		let restoreRoundSnapshot_stub;
		let restoreVotesSnapshot_stub;
		let checkSnapshotAvailability_stub;
		let updateDelegatesRanks_stub;
		let deleteRoundRewards_stub;
		let flush_stub;
		let res;

		beforeEach(async () => {
			// Init required properties
			scope.roundOutsiders = ['abc'];
			scope.roundDelegates = [
				'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
				'968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b',
				'380b952cd92f11257b71cce73f51df5e0a258e54f60bb82bccd2ba8b4dff2ec9',
			];
			scope.roundRewards = [1, 2, 3];
			scope.roundFees = 1000; // 9 LSK fee per delegate, 91 remaining fees

			scope.modules.accounts.generateAddressByPublicKey = function() {
				return delegate.address;
			};

			const delegate = {
				amount: 10000,
				delegate:
					'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
				address: '16010222169256538112L',
			};

			batch_stub = sinonSandbox.stub(dbStub, 'batch').resolves();
			updateMissedBlocks_stub = dbStub.rounds.updateMissedBlocks.resolves();
			getVotes_stub = storageStub.entities.Round.getTotalVotedAmount.resolves([
				delegate,
			]);
			updateVotes_stub = dbStub.rounds.updateVotes.resolves('QUERY');
			updateDelegatesRanks_stub = dbStub.rounds.updateDelegatesRanks.resolves();
			flush_stub = validScope.library.storage.entities.Round.delete;
			checkSnapshotAvailability_stub = dbStub.rounds.checkSnapshotAvailability.resolves(
				1
			);
			restoreRoundSnapshot_stub = dbStub.rounds.restoreRoundSnapshot.resolves();
			restoreVotesSnapshot_stub = dbStub.rounds.restoreVotesSnapshot.resolves();
			deleteRoundRewards_stub = dbStub.rounds.deleteRoundRewards.resolves();
			updateDelegatesRanks_stub = dbStub.rounds.updateDelegatesRanks.resolves();

			round = new Round(_.cloneDeep(scope), dbStub);
			res = round.backwardLand();
			await res;
		});

		it('should return promise', () => {
			return expect(isPromise(res)).to.be.true;
		});

		it('query getVotes should not be called', () => {
			return expect(getVotes_stub.called).to.be.false;
		});

		it('query updateVotes should not be called', () => {
			return expect(updateVotes_stub.called).to.be.false;
		});

		it('query updateMissedBlocks not be called', () => {
			return expect(updateMissedBlocks_stub.called).to.be.false;
		});

		it('query updateDelegatesRanks should be called once', () => {
			return expect(updateDelegatesRanks_stub.callCount).to.equal(1);
		});

		it('query flushRound should be called once', () => {
			return expect(flush_stub.callCount).to.equal(1);
		});

		it('modules.accounts.mergeAccountAndGet should be called 4 times', () => {
			// 3x delegates + 1x remaining fees
			return expect(
				round.scope.modules.accounts.mergeAccountAndGet.callCount
			).to.equal(4);
		});

		it('query checkSnapshotAvailability should be called once', () => {
			return expect(checkSnapshotAvailability_stub.callCount).to.equal(1);
		});

		it('query restoreRoundSnapshot should be called once', () => {
			return expect(restoreRoundSnapshot_stub.callCount).to.equal(1);
		});

		it('query restoreVotesSnapshot should be called once', () => {
			return expect(restoreVotesSnapshot_stub.callCount).to.equal(1);
		});

		it('query deleteRoundRewards should be called once', () => {
			return expect(deleteRoundRewards_stub.callCount).to.equal(1);
		});
	});
});
