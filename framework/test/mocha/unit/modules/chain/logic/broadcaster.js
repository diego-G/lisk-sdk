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

const Broadcaster = rewire(
	'../../../../../../src/modules/chain/logic/broadcaster'
);

describe('Broadcaster', () => {
	const force = true;
	const params = { limit: 10, broadhash: '123' };
	const options = {
		data: { peer: {}, block: {} },
		api: 'blocks',
		immediate: false,
	};
	let broadcaster;
	let broadcasts;
	let transactionStub;
	let peersStub;
	let loggerStub;
	let modulesStub;
	let peerList;
	let jobsQueue;
	let library;

	beforeEach(async () => {
		broadcasts = {
			active: true,
			broadcastInterval: 10000,
			releaseLimit: 10,
			parallelLimit: 10,
			relayLimit: 10,
			broadcastLimit: 10,
		};

		peerList = [
			{
				rpc: {
					blocks: sinonSandbox.stub(),
				},
			},
		];

		peersStub = {
			me: sinonSandbox.stub().returns(['192.168.10.10']),
			listRandomConnected: sinonSandbox.stub().returns(peerList),
		};

		transactionStub = {
			checkConfirmed: sinonSandbox.stub().callsArgWith(1, false),
		};

		loggerStub = {
			info: sinonSandbox.stub(),
			error: sinonSandbox.stub(),
			debug: sinonSandbox.stub(),
		};

		modulesStub = {
			peers: {
				list: sinonSandbox.stub().callsArgWith(1, null, peerList),
				getLastConsensus: sinonSandbox.stub().returns(101),
			},
			transport: {},
			transactions: {
				transactionInPool: sinonSandbox.stub().returns(false),
			},
		};

		jobsQueue = Broadcaster.__get__('jobsQueue');

		jobsQueue.register = sinonSandbox.stub();

		broadcaster = new Broadcaster(
			broadcasts,
			force,
			peersStub,
			transactionStub,
			loggerStub
		);

		broadcaster.bind(
			modulesStub.peers,
			modulesStub.transport,
			modulesStub.transactions
		);

		library = Broadcaster.__get__('library');
	});

	afterEach(() => {
		return sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should throw error with no params', async () =>
			expect(() => {
				new Broadcaster();
			}).to.throw());

		it('should load libraries', async () => {
			expect(library.logger).to.deep.equal(loggerStub);
			expect(library.logic.peers).to.deep.equal(peersStub);
			expect(library.config).to.deep.equal({
				broadcasts,
				forging: { force: true },
			});
			return expect(library.logic.transaction).to.deep.equal(transactionStub);
		});

		it('should return Broadcaster instance', async () => {
			expect(broadcaster).to.be.instanceOf(Broadcaster);
			expect(broadcaster)
				.to.have.property('queue')
				.that.is.an('Array');
			expect(broadcaster)
				.to.have.property('config')
				.that.is.an('object');
			return expect(broadcaster)
				.to.have.property('routes')
				.that.is.an('Array');
		});

		it('should register jobsQueue', async () => {
			expect(jobsQueue.register.calledOnce).to.be.true;
			expect(jobsQueue.register).to.be.calledWithExactly(
				'broadcasterReleaseQueue',
				broadcaster.releaseQueue,
				broadcasts.broadcastInterval
			);
		});
	});

	describe('getPeers', () => {
		it('should throw error for empty params', async () => {
			expect(broadcaster.getPeers(null)).to.be.rejectedWith(TypeError);
			expect(broadcaster.getPeers(null)).to.be.rejectedWith(
				"Cannot read property 'limit' of null"
			);
		});

		it('should return peers for default params', async () => {
			const peers = await broadcaster.getPeers({});
			expect(peers).to.be.an('Array').that.is.not.empty;
			expect(peers).to.deep.equal(peerList);
			expect(peersStub.listRandomConnected.called).to.be.true;
			expect(peersStub.listRandomConnected.args[0][0]).to.not.equal(params);
		});

		it('should return peer list for a given params', async () => {
			const peers = await broadcaster.getPeers(params);
			expect(peers).to.be.an('Array').that.is.not.empty;
			expect(peers).to.deep.equal(peerList);
			expect(peersStub.listRandomConnected.calledOnce).to.be.true;
		});

		it('should reach consensus', async () => {
			const peerParams = _.cloneDeep(params);
			peerParams.limit = 100;
			await broadcaster.getPeers(peerParams);
			expect(peersStub.listRandomConnected.calledOnce).to.be.true;
			expect(peersStub.listRandomConnected.args[0][0]).to.deep.equal(
				peerParams
			);
			expect(peersStub.listRandomConnected.args[0][1]).to.not.be.a('function');
		});
	});

	describe('broadcast', () => {
		beforeEach(async () => {
			broadcaster.getPeers = sinonSandbox.stub().resolves(peerList);
		});

		it('should throw error for empty peers', async () => {
			const peerErr = new Error('empty peer list');
			broadcaster.getPeers.rejects(peerErr);
			expect(broadcaster.broadcast(params, options)).to.be.rejectedWith(
				peerErr
			);
		});

		it('should return empty peers', async () => {
			const peerParams = _.cloneDeep(params);
			peerParams.peers = [];
			const res = await broadcaster.broadcast(peerParams, options);
			expect(res).to.be.an('array').that.is.empty;
		});

		it('should be able to get peers for broadcast', async () => {
			const res = await broadcaster.broadcast(params, options);
			expect(res).to.be.an('array').that.is.not.empty;
			expect(res).to.deep.equal(peerList);
			expect(options.data.block).to.be.instanceOf(Object);
		});

		it(`should only send to ${params.limit} peers`, async () => {
			const limitedPeers = _.cloneDeep(params);
			limitedPeers.limit = 10;
			limitedPeers.peers = _.range(100).map(() => peerList[0]);
			const res = await broadcaster.broadcast(limitedPeers, options);
			expect(res).to.be.an('array').that.is.not.empty;
			expect(res.length).to.eql(broadcasts.broadcastLimit);
		});

		it('should be able to broadcast block to peers', async () => {
			params.peers = peerList;
			options.data.block = {};
			expect(options.data.block).to.be.an('object');
			const res = await broadcaster.broadcast(params, options);
			expect(res).to.be.an('array').that.is.not.empty;
			expect(res).to.deep.equal(peerList);
			expect(options.data.block).to.be.instanceOf(Object);
			expect(peerList[0].rpc.blocks.called).to.be.true;
			expect(peerList[0].rpc.blocks.args[0][0].block).to.be.instanceOf(Object);
		});
	});

	describe('enqueue', () => {
		it('should throw error for no params', async () =>
			expect(() => {
				broadcaster.enqueue();
			})
				.to.throw()
				.to.be.instanceOf(Error));

		it('should push params and options to queue', async () => {
			const auxParams = {};
			const auxOptions = {};
			expect(broadcaster.enqueue(auxParams, auxOptions)).to.eql(1);
			return expect(broadcaster.enqueue(auxParams, auxOptions)).to.eql(2);
		});
	});

	describe('maxRelays', () => {
		it('should return true if exhausted', async () =>
			expect(broadcaster.maxRelays({ relays: 11 })).to.be.true);

		it('should return false if max relay is less than relay limit', async () =>
			expect(broadcaster.maxRelays({ relays: 9 })).to.be.false);
	});

	describe('filterQueue', () => {
		const validTransaction = { id: '321' };
		const validSignature = { transactionId: '123' };
		beforeEach(done => {
			broadcaster.queue = [];
			done();
		});

		describe('having one transaction broadcast in queue with immediate = true', () => {
			beforeEach(async () => {
				broadcaster.enqueue(params, {
					api: 'postTransactions',
					data: { transaction: validTransaction },
					immediate: true,
				});
				// ToDo: Why is enqueue overwriting immediate parameter with false?
				broadcaster.queue[0].options.immediate = true;
			});

			it('should set an empty broadcaster.queue and skip the broadcast', async () => {
				await broadcaster.filterQueue();
				expect(broadcaster.queue)
					.to.be.an('Array')
					.to.eql([]);
			});
		});

		describe('having one transaction broadcast in queue of transaction = undefined', () => {
			beforeEach(async () => {
				broadcaster.enqueue(params, {
					api: 'postTransactions',
					data: { transaction: undefined },
					immediate: true,
				});
			});

			it('should set an empty broadcaster.queue and skip the broadcast', async () => {
				await broadcaster.filterQueue();
				expect(broadcaster.queue)
					.to.be.an('Array')
					.to.eql([]);
			});
		});

		describe('having one signature broadcast in queue', () => {
			beforeEach(async () => {
				broadcaster.enqueue(params, {
					api: 'postSignatures',
					data: { signature: validSignature },
					immediate: false,
				});
			});

			it('should call transaction pool with [signature.transactionId]', async () => {
				await broadcaster.filterQueue();
				expect(modulesStub.transactions.transactionInPool).calledWithExactly(
					validSignature.transactionId
				);
			});
		});

		describe('having one transaction broadcast in queue', () => {
			let broadcast;
			beforeEach(async () => {
				broadcaster.enqueue(params, {
					api: 'postTransactions',
					data: { transaction: validTransaction },
					immediate: false,
				});
				broadcast = Object.assign(
					{},
					{ params },
					{
						options: {
							api: 'postTransactions',
							data: { transaction: validTransaction },
							immediate: false,
						},
					}
				);
			});

			it('should call transaction pool with [transaction.id]', async () => {
				await broadcaster.filterQueue();
				expect(modulesStub.transactions.transactionInPool).calledWithExactly(
					validTransaction.id
				);
			});

			describe('when [validTransaction] exists in transaction pool', () => {
				beforeEach(async () => {
					modulesStub.transactions.transactionInPool.returns(true);
				});
				it('should leave [broadcast] in broadcaster.queue', async () => {
					await broadcaster.filterQueue();
					expect(broadcaster.queue)
						.to.be.an('Array')
						.to.eql([broadcast]);
				});
			});

			describe('when [validTransaction] does not exist in transaction pool', () => {
				beforeEach(async () => {
					modulesStub.transactions.transactionInPool.returns(false);
				});
				describe('when [validTransaction] is confirmed', () => {
					beforeEach(async () => {
						transactionStub.checkConfirmed.callsArgWith(1, null, true);
					});
					it('should set an empty broadcaster.queue and skip the broadcast', async () => {
						await broadcaster.filterQueue();
						expect(broadcaster.queue)
							.to.be.an('Array')
							.to.eql([]);
					});
				});
				describe('when [validTransaction] is not confirmed', () => {
					beforeEach(async () => {
						transactionStub.checkConfirmed.callsArgWith(1, null, false);
					});
					it('should leave [broadcast] in broadcaster.queue', async () => {
						broadcaster.filterQueue(() => {
							expect(broadcaster.queue)
								.to.be.an('Array')
								.to.eql([broadcast]);
						});
					});
				});
				describe('when error occurs while checking if [validTransaction] is confirmed', () => {
					beforeEach(async () => {
						transactionStub.checkConfirmed.callsArgWith(
							1,
							'Checking if transction is confirmed error',
							false
						);
					});
					it('should set an empty broadcaster.queue and skip the broadcast', async () => {
						await broadcaster.filterQueue();
						expect(broadcaster.queue)
							.to.be.an('Array')
							.to.eql([]);
					});
				});
			});
		});

		describe('having many transaction and signatures broadcasts in queue', () => {
			const auxBroadcasts = [];
			beforeEach(async () => {
				broadcaster.enqueue(params, {
					api: 'postTransactions',
					data: { transaction: { id: 1 } },
					immediate: false,
				});
				broadcaster.enqueue(params, {
					api: 'postTransactions',
					data: { transaction: { id: 2 } },
					immediate: false,
				});
				broadcaster.enqueue(params, {
					api: 'postTransactions',
					data: { transaction: { id: 3 } },
					immediate: false,
				});
				auxBroadcasts.push(
					Object.assign(
						{},
						{ params },
						{
							options: {
								api: 'postTransactions',
								data: { transaction: { id: 1 } },
								immediate: false,
							},
						}
					)
				);
				auxBroadcasts.push(
					Object.assign(
						{},
						{ params },
						{
							options: {
								api: 'postTransactions',
								data: { transaction: { id: 2 } },
								immediate: false,
							},
						}
					)
				);
				auxBroadcasts.push(
					Object.assign(
						{},
						{ params },
						{
							options: {
								api: 'postTransactions',
								data: { transaction: { id: 3 } },
								immediate: false,
							},
						}
					)
				);
				broadcaster.enqueue(params, {
					api: 'postSignatures',
					data: { signature: { transactionId: 1 } },
					immediate: false,
				});
				broadcaster.enqueue(params, {
					api: 'postSignatures',
					data: { signature: { transactionId: 2 } },
					immediate: false,
				});
				auxBroadcasts.push(
					Object.assign(
						{},
						{ params },
						{
							options: {
								api: 'postSignatures',
								data: { signature: { transactionId: 1 } },
								immediate: false,
							},
						}
					)
				);
				auxBroadcasts.push(
					Object.assign(
						{},
						{ params },
						{
							options: {
								api: 'postSignatures',
								data: { signature: { transactionId: 2 } },
								immediate: false,
							},
						}
					)
				);
			});

			describe('when all of them exist in transaction pool', () => {
				beforeEach(async () => {
					modulesStub.transactions.transactionInPool.returns(true);
				});
				it('should leave all of them in broadcaster.queue', async () => {
					await broadcaster.filterQueue();
					expect(broadcaster.queue)
						.to.be.an('Array')
						.to.eql(auxBroadcasts);
				});
			});
		});
	});

	describe('squashQueue', () => {
		it('should return empty array for no params and empty object', async () => {
			expect(broadcaster.squashQueue({})).to.eql([]);
			return expect(broadcaster.squashQueue()).to.eql([]);
		});

		it('should be able to squash the queue', async () => {
			const auxBroadcasts = {
				broadcast: {
					options: { api: 'postTransactions', data: { peer: {}, block: {} } },
				},
			};
			return expect(broadcaster.squashQueue(auxBroadcasts)).to.eql([
				{
					immediate: false,
					options: {
						api: 'postTransactions',
						data: {
							transactions: [],
						},
					},
				},
			]);
		});
	});

	describe('releaseQueue', () => {
		beforeEach(async () => {
			broadcaster.getPeers = sinonSandbox.stub().resolves(peerList);
			broadcaster.broadcast = sinonSandbox.stub().resolves(peerList);
			loggerStub.info = sinonSandbox.stub();
		});

		it('should return immediately for an empty queue', async () => {
			await broadcaster.releaseQueue();
			expect(loggerStub.info.called).to.be.true;
			expect(loggerStub.info.args[0][0]).to.be.eql(
				'Releasing enqueued broadcasts'
			);
			expect(loggerStub.info.args[1][0]).to.be.eql('Queue empty');
		});

		it('should return error when failed to broadcast to queue', async () => {
			const filterQueueStub = sinonSandbox
				.stub()
				.rejects(new Error('failed to broadcast'));
			broadcaster.filterQueue = filterQueueStub;
			broadcaster.enqueue(params, options);
			expect(broadcaster.releaseQueue()).rejectedWith('failed to broadcast');
		});
	});
});
