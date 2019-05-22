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

// Global imports
const util = require('util');
const rewire = require('rewire');
const async = require('async');
const _ = require('lodash');
const { registeredTransactions } = require('./registered_transactions');
const ed = require('../../../src/modules/chain/helpers/ed');
const jobsQueue = require('../../../src/modules/chain/helpers/jobs_queue');
const Sequence = require('../../../src/modules/chain/helpers/sequence');
const { BlockSlots } = require('../../../src/modules/chain/logic/block_slots');
const { createCacheComponent } = require('../../../src/components/cache');
const { StorageSandbox } = require('./storage_sandbox');
const { ZSchema } = require('../../../src/controller/validator');
const initSteps = require('../../../src/modules/chain/init_steps');

const promisifyParallel = util.promisify(async.parallel);
let currentAppScope;

const modulesInit = {
	blocks: '../../../src/modules/chain/submodules/blocks',
	peers: '../../../src/modules/chain/submodules/peers',
};

function init(options, cb) {
	options = options || {};
	options.scope = options.scope ? options.scope : {};
	// Wait for genesisBlock only if false is provided
	options.scope.waitForGenesisBlock = options.waitForGenesisBlock !== false;

	__init(options.sandbox, options.scope)
		.then(scope => cb(null, scope))
		.catch(err => cb(err));
}

// Init whole application inside tests
async function __init(sandbox, initScope) {
	__testContext.debug(
		'initApplication: Application initialization inside test environment started...'
	);

	jobsQueue.jobs = {};

	__testContext.config.modules.chain.syncing.active = false;
	__testContext.config.modules.chain.broadcasts.active = false;
	__testContext.config = Object.assign(
		__testContext.config,
		initScope.config || {}
	);

	const config = __testContext.config.modules.chain;
	let storage;
	if (!initScope.components) {
		initScope.components = {};
	}

	try {
		if (sandbox && !initScope.components.storage) {
			storage = new StorageSandbox(
				sandbox.config || __testContext.config.components.storage,
				sandbox.name
			);
		} else {
			__testContext.config.components.storage.user =
				__testContext.config.components.storage.user || process.env.USER;
			storage = new StorageSandbox(__testContext.config.components.storage);
		}

		__testContext.debug(
			`initApplication: Target database - ${storage.options.database}`
		);

		const startStorage = async () =>
			(storage.isReady ? Promise.resolve() : storage.bootstrap())
				.then(() => {
					storage.entities.Account.extendDefaultOptions({
						limit: global.constants.ACTIVE_DELEGATES,
					});

					return storage.adapter.task('clear-tables', t =>
						t.batch([
							storage.adapter.execute(
								'DELETE FROM blocks WHERE height > 1',
								{},
								{},
								t
							),
							storage.adapter.execute('DELETE FROM blocks', {}, {}, t),
							storage.adapter.execute('DELETE FROM mem_accounts', {}, {}, t),
						])
					);
				})
				.then(async status => {
					if (status) {
						await storage.entities.Migration.applyAll();
					}
				});

		const logger = initScope.components.logger || {
			trace: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			log: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
		};

		const scope = _.merge(
			{
				lastCommit: '',
				ed,
				build: '',
				config,
				genesisBlock: { block: __testContext.config.genesisBlock },
				registeredTransactions,
				schema: new ZSchema(),
				sequence: new Sequence({
					onWarning(current) {
						logger.warn('Main queue', current);
					},
				}),
				balancesSequence: new Sequence({
					onWarning(current) {
						logger.warn('Balance queue', current);
					},
				}),
				channel: {
					invoke: sinonSandbox.stub(),
					publish: sinonSandbox.stub(),
					suscribe: sinonSandbox.stub(),
					once: sinonSandbox.stub().callsArg(1),
				},
				applicationState: __testContext.config.initialState,
			},
			initScope
		);
		const cache = createCacheComponent(
			__testContext.config.components.cache,
			logger
		);

		scope.components = {
			logger,
			storage,
			cache,
		};

		await startStorage();
		await cache.bootstrap();

		scope.bus = await initSteps.createBus();
		scope.logic = await initSteps.initLogicStructure(scope);
		scope.modules = await initStepsForTest.initModules(scope);

		// Ready to bind modules
		scope.logic.account.bindModules(scope.modules);

		// Fire onBind event in every module
		scope.bus.message('bind', scope);

		// Listen to websockets
		// await scope.webSocket.listen();
		// Listen to http, https servers
		// await scope.network.listen();
		// logger.info('Modules ready and launched');

		currentAppScope = scope;
		__testContext.debug('initApplication: Rewired modules available');

		// Overwrite syncing function to prevent interfere with tests
		scope.modules.loader.syncing = function() {
			return false;
		};

		// If bus is overridden, then we just return the scope, without waiting for genesisBlock
		if (!initScope.waitForGenesisBlock || initScope.bus) {
			scope.modules.delegates.onBlockchainReady = function() {};
			return scope;
		}

		// Overwrite onBlockchainReady function to prevent automatic forging
		await scope.modules.loader.loadBlockChain();
		return scope;
	} catch (error) {
		__testContext.debug('Error during test application init.', error);
		throw error;
	}
}

function cleanup(done) {
	if (
		Object.prototype.hasOwnProperty.call(currentAppScope, 'components') &&
		currentAppScope.components !== undefined
	) {
		currentAppScope.components.cache.cleanup();
	}
	async.eachSeries(
		currentAppScope.modules,
		(module, cb) => {
			if (typeof module.cleanup === 'function') {
				module.cleanup();
				return cb();
			}
			return cb();
		},
		err => {
			if (err) {
				currentAppScope.components.logger.error(err);
			} else {
				currentAppScope.components.logger.info('Cleaned up successfully');
			}
			// Disconnect from database instance if sandbox was used
			if (currentAppScope.components.storage) {
				currentAppScope.components.storage.cleanup();
			}
			done(err);
		}
	);
}

const initStepsForTest = {
	initModules: async scope => {
		const tasks = {};
		scope.rewiredModules = {};
		const modules = {};

		Object.keys(modulesInit).forEach(name => {
			tasks[name] = function(tasksCb) {
				const Instance = rewire(modulesInit[name]);
				scope.rewiredModules[name] = Instance;
				modules[name] = new Instance(tasksCb, scope);
			};
		});

		const { TransactionManager: RewiredTransactionManager } = rewire(
			'../../../src/modules/chain/transactions'
		);
		scope.rewiredModules.transactionManager = RewiredTransactionManager;
		const slots = new BlockSlots({
			epochTime: __testContext.config.constants.EPOCH_TIME,
			interval: __testContext.config.constants.BLCOK_TIME,
			blocksPerRound: __testContext.config.constants.ACTIVE_DELEGATES,
		});
		modules.transactionManager = new RewiredTransactionManager(
			__testContext.config.modules.chain.registeredTransactions
		);
		scope.modules = scope.modules || {};
		scope.modules = modules;
		await promisifyParallel(tasks);
		const { TransactionPool: RewiredTransactionPool } = rewire(
			'../../../src/modules/chain/transaction_pool'
		);
		scope.rewiredModules.transactionPool = RewiredTransactionPool;
		modules.transactionPool = new RewiredTransactionPool({
			storage: scope.components.storage,
			slots,
			blocks: scope.modules.blocks,
			exceptions: __testContext.config.modules.chain.exceptions,
			logger: scope.components.logger,
			maxTransactionsPerQueue:
				__testContext.config.modules.chain.transactions.maxTransactionsPerQueue,
			expireTransactionsInterval:
				__testContext.config.constants.EXPIRY_INTERVAL,
			maxTransactionsPerBlock:
				__testContext.config.constants.MAX_TRANSACTIONS_PER_BLOCK,
			maxSharedTransactions:
				__testContext.config.constants.MAX_SHARED_TRANSACTIONS,
			broadcastInterval:
				__testContext.config.modules.chain.broadcasts.broadcastInterval,
			releaseLimit: __testContext.config.modules.chain.broadcasts.releaseLimit,
		});
		// TODO: remove rewiring
		const RewiredLoader = rewire('../../../src/modules/chain/loader');
		scope.rewiredModules.loader = RewiredLoader;
		modules.loader = new RewiredLoader(scope);
		const { Forger: RewiredForge } = rewire(
			'../../../src/modules/chain/forger'
		);
		scope.rewiredModules.forger = RewiredForge;
		modules.forger = new RewiredForge(scope);
		const RewiredTransport = rewire('../../../src/modules/chain/transport');
		scope.rewiredModules.transport = RewiredTransport;
		modules.transport = new RewiredTransport(scope);
		const {
			Rounds: RewiredRounds,
		} = require('../../../src/modules/chain/rounds');
		modules.rounds = new RewiredRounds(scope);

		scope.bus.registerModules(modules);

		return modules;
	},
};

module.exports = {
	init,
	cleanup,
};
