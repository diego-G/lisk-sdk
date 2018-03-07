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

const async = require('async');
const constants = require('../helpers/constants.js');
const jobsQueue = require('../helpers/jobs_queue.js');
const slots = require('../helpers/slots.js');

require('colors');

// Private fields
let modules;
let definitions;
let library;
let self;
const __private = {};

__private.loaded = false;
__private.isActive = false;
__private.lastBlock = null;
__private.genesisBlock = null;
__private.total = 0;
__private.blocksToSync = 0;
__private.syncIntervalId = null;
__private.syncInterval = 10000;
__private.retries = 5;

/**
 * Main loader methods. Initializes library with scope content.
 * Calls private function initialize.
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires async
 * @requires helpers/constants
 * @requires helpers/jobs_queue
 * @requires helpers/slots
 * @requires logic/peer
 * @param {function} cb - Callback function
 * @param {scope} scope - App instance
 * @returns {setImmediateCallback} cb, null, self
 */
// Constructor
class Loader {
	constructor(cb, scope) {
		library = {
			logger: scope.logger,
			db: scope.db,
			network: scope.network,
			schema: scope.schema,
			sequence: scope.sequence,
			bus: scope.bus,
			genesisblock: scope.genesisblock,
			balancesSequence: scope.balancesSequence,
			logic: {
				transaction: scope.logic.transaction,
				account: scope.logic.account,
				peers: scope.logic.peers,
			},
			config: {
				loading: {
					verifyOnLoading: scope.config.loading.verifyOnLoading,
					snapshot: scope.config.loading.snapshot,
				},
			},
		};
		self = this;

		__private.initialize();
		__private.lastBlock = library.genesisblock;
		__private.genesisBlock = library.genesisblock;

		setImmediate(cb, null, self);
	}
}

// Private methods
/**
 * Sets private network object with height 0 and peers empty array.
 *
 * @private
 */
__private.initialize = function() {
	__private.network = {
		height: 0, // Network height
		peers: [], // "Good" peers and with height close to network height
	};
};

/**
 * Cancels timers based on input parameter and private constiable syncIntervalId
 * or Sync trigger by sending a socket signal with 'loader/sync' and setting
 * next sync with 1000 milliseconds.
 *
 * @private
 * @param {boolean} turnOn
 * @emits loader/sync
 * @todo Add description for the params
 */
__private.syncTrigger = function(turnOn) {
	if (turnOn === false && __private.syncIntervalId) {
		library.logger.trace('Clearing sync interval');
		clearTimeout(__private.syncIntervalId);
		__private.syncIntervalId = null;
	}
	if (turnOn === true && !__private.syncIntervalId) {
		library.logger.trace('Setting sync interval');
		setImmediate(function nextSyncTrigger() {
			library.logger.trace('Sync trigger');
			library.network.io.sockets.emit('loader/sync', {
				blocks: __private.blocksToSync,
				height: modules.blocks.lastBlock.get().height,
			});
			__private.syncIntervalId = setTimeout(nextSyncTrigger, 1000);
		});
	}
};

/**
 * Syncs timer trigger.
 *
 * @private
 * @todo Add @returns tag
 */
__private.syncTimer = function() {
	library.logger.trace('Setting sync timer');

	/**
	 * Description of nextSync.
	 *
	 * @param {function} cb
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	function nextSync(cb) {
		library.logger.trace('Sync timer trigger', {
			loaded: __private.loaded,
			syncing: self.syncing(),
			last_receipt: modules.blocks.lastReceipt.get(),
		});

		if (
			__private.loaded &&
			!self.syncing() &&
			modules.blocks.lastReceipt.isStale()
		) {
			library.sequence.add(
				sequenceCb => {
					__private.sync(sequenceCb);
				},
				err => {
					if (err) {
						library.logger.error('Sync timer', err);
					}
					return setImmediate(cb);
				}
			);
		} else {
			return setImmediate(cb);
		}
	}

	jobsQueue.register('loaderSyncTimer', nextSync, __private.syncInterval);
};

/**
 * Gets a random peer and loads signatures from network.
 * Processes each signature from peer.
 *
 * @private
 * @param {function} cb
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 */
__private.loadSignatures = function(cb) {
	async.waterfall(
		[
			function(waterCb) {
				self.getNetwork((err, network) => {
					if (err) {
						return setImmediate(waterCb, err);
					}
					const peer =
						network.peers[Math.floor(Math.random() * network.peers.length)];
					return setImmediate(waterCb, null, peer);
				});
			},
			function(peer, waterCb) {
				library.logger.log(`Loading signatures from: ${peer.string}`);
				peer.rpc.getSignatures((err, res) => {
					if (err) {
						modules.peers.remove(peer);
						return setImmediate(waterCb, err);
					}
					library.schema.validate(res, definitions.WSSignaturesResponse, err =>
						setImmediate(waterCb, err, res.signatures)
					);
				});
			},
			function(signatures, waterCb) {
				library.sequence.add(cb => {
					async.eachSeries(
						signatures,
						(signature, eachSeriesCb) => {
							async.eachSeries(
								signature.signatures,
								(s, eachSeriesCb) => {
									modules.multisignatures.processSignature(
										{
											signature: s,
											transactionId: signature.transactionId,
										},
										err => setImmediate(eachSeriesCb, err)
									);
								},
								eachSeriesCb
							);
						},
						cb
					);
				}, waterCb);
			},
		],
		err => setImmediate(cb, err)
	);
};

/**
 * Gets a random peer and loads transactions from network:
 * - Validates each transaction from peer and remove peer if invalid.
 * - Calls processUnconfirmedTransaction for each transaction.
 *
 * @private
 * @param {function} cb
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 * @todo Missing error propagation when calling balancesSequence.add
 */
__private.loadTransactions = function(cb) {
	async.waterfall(
		[
			function(waterCb) {
				self.getNetwork((err, network) => {
					if (err) {
						return setImmediate(waterCb, err);
					}
					const peer =
						network.peers[Math.floor(Math.random() * network.peers.length)];
					return setImmediate(waterCb, null, peer);
				});
			},
			function(peer, waterCb) {
				library.logger.log(`Loading transactions from: ${peer.string}`);
				peer.rpc.getTransactions((err, res) => {
					if (err) {
						modules.peers.remove(peer);
						return setImmediate(waterCb, err);
					}
					library.schema.validate(
						res,
						definitions.WSTransactionsResponse,
						err => {
							if (err) {
								return setImmediate(waterCb, err[0].message);
							}
							return setImmediate(waterCb, null, peer, res.transactions);
						}
					);
				});
			},
			function(peer, transactions, waterCb) {
				async.eachSeries(
					transactions,
					(transaction, eachSeriesCb) => {
						const id = transaction ? transactions.id : 'null';

						try {
							transaction = library.logic.transaction.objectNormalize(
								transaction
							);
						} catch (e) {
							library.logger.debug('Transaction normalization failed', {
								id,
								err: e.toString(),
								module: 'loader',
								transaction,
							});

							library.logger.warn(
								['Transaction', id, 'is not valid, peer removed'].join(' '),
								peer.string
							);
							modules.peers.remove(peer.ip, peer.wsPort);

							return setImmediate(eachSeriesCb, e);
						}

						return setImmediate(eachSeriesCb);
					},
					err => setImmediate(waterCb, err, transactions)
				);
			},
			function(transactions, waterCb) {
				async.eachSeries(
					transactions,
					(transaction, eachSeriesCb) => {
						library.balancesSequence.add(
							cb => {
								transaction.bundled = true;
								modules.transactions.processUnconfirmedTransaction(
									transaction,
									false,
									cb
								);
							},
							err => {
								if (err) {
									// TODO: Validate if error propagation required
									library.logger.debug(err);
								}
								return setImmediate(eachSeriesCb);
							}
						);
					},
					waterCb
				);
			},
		],
		err => setImmediate(cb, err)
	);
};

/**
 * Loads blockchain upon application start:
 * 1. Checks mem tables:
 * - count blocks from `blocks` table
 * - get genesis block from `blocks` table
 * - count accounts from `mem_accounts` table by block id
 * - get rounds from `mem_round`
 * 2. Matches genesis block with database.
 * 3. Verifies snapshot mode.
 * 4. Recreates memory tables when neccesary:
 *  - Calls logic.account to resetMemTables
 *  - Calls block to load block. When blockchain ready emits a bus message.
 * 5. Detects orphaned blocks in `mem_accounts` and gets delegates.
 * 6. Loads last block and emits a bus message blockchain is ready.
 *
 * @private
 * @emits exit
 * @throws {string} On failure to match genesis block with database.
 * @todo Add @returns tag
 */
__private.loadBlockChain = function() {
	let offset = 0;
	const limit = Number(library.config.loading.loadPerIteration) || 1000;
	let verify = Boolean(library.config.loading.verifyOnLoading);

	/**
	 * Description of load.
	 *
	 * @todo Add @param tags
	 * @todo Add description for the function
	 */
	function load(count) {
		verify = true;
		__private.total = count;
		async.series(
			{
				resetMemTables(seriesCb) {
					library.logic.account.resetMemTables(err => {
						if (err) {
							throw err;
						} else {
							return setImmediate(seriesCb);
						}
					});
				},
				loadBlocksOffset(seriesCb) {
					async.until(
						() => count < offset,
						cb => {
							if (count > 1) {
								library.logger.info(
									`Rebuilding blockchain, current block height: ${offset + 1}`
								);
							}
							modules.blocks.process.loadBlocksOffset(
								limit,
								offset,
								verify,
								(err, lastBlock) => {
									if (err) {
										return setImmediate(cb, err);
									}

									offset += limit;
									__private.lastBlock = lastBlock;

									return setImmediate(cb);
								}
							);
						},
						err => setImmediate(seriesCb, err)
					);
				},
			},
			err => {
				if (err) {
					library.logger.error(err);
					if (err.block) {
						library.logger.error(`Blockchain failed at: ${err.block.height}`);
						modules.blocks.chain.deleteAfterBlock(err.block.id, () => {
							library.logger.error('Blockchain clipped');
							library.bus.message('blockchainReady');
						});
					}
				} else {
					library.logger.info('Blockchain ready');
					library.bus.message('blockchainReady');
				}
			}
		);
	}

	/**
	 * Description of reload.
	 *
	 * @todo Add @returns and @param tags
	 * @todo Add description for the function
	 */
	function reload(count, message) {
		if (message) {
			library.logger.warn(message);
			library.logger.warn('Recreating memory tables');
		}

		return load(count);
	}

	/**
	 * Description of checkMemTables.
	 *
	 * @todo Add @returns and @param tags
	 * @todo Add description for the function
	 */
	function checkMemTables(t) {
		const promises = [
			t.blocks.count(),
			t.blocks.getGenesisBlock(),
			t.accounts.countMemAccounts(),
			t.rounds.getMemRounds(),
			t.delegates.countDuplicatedDelegates(),
		];

		return t.batch(promises);
	}

	/**
	 * Description of matchGenesisBlock.
	 *
	 * @todo Add @throws and @param tags
	 * @todo Add description for the function
	 */
	function matchGenesisBlock(row) {
		if (row) {
			const matched =
				row.id === __private.genesisBlock.block.id &&
				row.payloadHash.toString('hex') ===
					__private.genesisBlock.block.payloadHash &&
				row.blockSignature.toString('hex') ===
					__private.genesisBlock.block.blockSignature;
			if (matched) {
				library.logger.info('Genesis block matched with database');
			} else {
				throw 'Failed to match genesis block with database';
			}
		}
	}

	/**
	 * Description of verifySnapshot.
	 *
	 * @todo Add @returns and @param tags
	 * @todo Add description for the function
	 */
	function verifySnapshot(count, round) {
		if (
			library.config.loading.snapshot !== undefined ||
			library.config.loading.snapshot > 0
		) {
			library.logger.info('Snapshot mode enabled');

			if (
				isNaN(library.config.loading.snapshot) ||
				library.config.loading.snapshot >= round
			) {
				library.config.loading.snapshot = round;

				if (count === 1 || count % constants.activeDelegates > 0) {
					library.config.loading.snapshot = round > 1 ? round - 1 : 1;
				}

				modules.rounds.setSnapshotRound(library.config.loading.snapshot);
			}

			library.logger.info(
				`Snapshotting to end of round: ${library.config.loading.snapshot}`
			);
			return true;
		}
		return false;
	}

	library.db
		.task(checkMemTables)
		.spread(
			(
				blocksCount,
				getGenesisBlock,
				memAccountsCount,
				getMemRounds,
				duplicatedDelegatesCount
			) => {
				library.logger.info(`Blocks ${blocksCount}`);

				const round = slots.calcRound(blocksCount);

				if (blocksCount === 1) {
					return reload(blocksCount);
				}

				matchGenesisBlock(getGenesisBlock[0]);

				verify = verifySnapshot(blocksCount, round);

				if (verify) {
					return reload(blocksCount, 'Blocks verification enabled');
				}

				const missed = !memAccountsCount;

				if (missed) {
					return reload(blocksCount, 'Detected missed blocks in mem_accounts');
				}

				const unapplied = getMemRounds.filter(
					row => row.round !== String(round)
				);

				if (unapplied.length > 0) {
					return reload(blocksCount, 'Detected unapplied rounds in mem_round');
				}

				if (duplicatedDelegatesCount > 0) {
					library.logger.error(
						'Delegates table corrupted with duplicated entries'
					);
					return process.emit('exit');
				}

				function updateMemAccounts(t) {
					const promises = [
						t.accounts.updateMemAccounts(),
						t.accounts.getOrphanedMemAccounts(),
						t.accounts.getDelegates(),
					];
					return t.batch(promises);
				}

				return library.db
					.task(updateMemAccounts)
					.spread((updateMemAccounts, getOrphanedMemAccounts, getDelegates) => {
						if (getOrphanedMemAccounts.length > 0) {
							return reload(
								blocksCount,
								'Detected orphaned blocks in mem_accounts'
							);
						}

						if (getDelegates.length === 0) {
							return reload(blocksCount, 'No delegates found');
						}

						modules.blocks.utils.loadLastBlock((err, block) => {
							if (err) {
								return reload(blocksCount, err || 'Failed to load last block');
							}
							__private.lastBlock = block;
							library.logger.info('Blockchain ready');
							library.bus.message('blockchainReady');
						});
					});
			}
		)
		.catch(err => {
			library.logger.error(err.stack || err);
			return process.emit('exit');
		});
};

/**
 * Loads blocks from network.
 *
 * @private
 * @param {function} cb
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 */
__private.loadBlocksFromNetwork = function(cb) {
	let errorCount = 0;
	let loaded = false;

	self.getNetwork((err, network) => {
		if (err) {
			return setImmediate(cb, err);
		}
		async.whilst(
			() => !loaded && errorCount < 5,
			next => {
				const peer =
					network.peers[Math.floor(Math.random() * network.peers.length)];
				let lastBlock = modules.blocks.lastBlock.get();

				function loadBlocks() {
					__private.blocksToSync = peer.height;

					modules.blocks.process.loadBlocksFromPeer(
						peer,
						(err, lastValidBlock) => {
							if (err) {
								library.logger.error(err.toString());
								library.logger.error(
									`Failed to load blocks from: ${peer.string}`
								);
								errorCount += 1;
							}
							loaded = lastValidBlock.id === lastBlock.id;
							lastBlock = null;
							lastValidBlock = null;
							next();
						}
					);
				}

				/**
				 * Description of getCommonBlock.
				 *
				 * @todo Add @returns and @param tags
				 * @todo Add description for the function
				 */
				function getCommonBlock(cb) {
					library.logger.info(`Looking for common block with: ${peer.string}`);
					modules.blocks.process.getCommonBlock(
						peer,
						lastBlock.height,
						(err, commonBlock) => {
							if (!commonBlock) {
								if (err) {
									library.logger.error(err.toString());
								}
								library.logger.error(
									`Failed to find common block with: ${peer.string}`
								);
								errorCount += 1;
								return next();
							}
							library.logger.info(
								[
									'Found common block:',
									commonBlock.id,
									'with:',
									peer.string,
								].join(' ')
							);
							return setImmediate(cb);
						}
					);
				}

				if (lastBlock.height === 1) {
					loadBlocks();
				} else {
					getCommonBlock(loadBlocks);
				}
			},
			err => {
				if (err) {
					library.logger.error('Failed to load blocks from network', err);
					return setImmediate(cb, err);
				}
				return setImmediate(cb);
			}
		);
	});
};

/**
 * Performs sync operation:
 * - Undoes unconfirmed transactions.
 * - Establishes broadhash consensus before sync.
 * - Performs sync operation: loads blocks from network, updates system.
 * - Establishes broadhash consensus after sync.
 * - Applies unconfirmed transactions.
 *
 * @private
 * @param {function} cb
 * @todo Check err actions
 * @todo Add description for the params
 */
__private.sync = function(cb) {
	library.logger.info('Starting sync');
	library.bus.message('syncStarted');

	__private.isActive = true;
	__private.syncTrigger(true);

	async.series(
		{
			getPeersBefore(seriesCb) {
				library.logger.debug('Establishing broadhash consensus before sync');
				return modules.transport.getPeers(
					{ limit: constants.maxPeers },
					seriesCb
				);
			},
			loadBlocksFromNetwork(seriesCb) {
				return __private.loadBlocksFromNetwork(seriesCb);
			},
			updateSystem(seriesCb) {
				return modules.system.update(seriesCb);
			},
			getPeersAfter(seriesCb) {
				library.logger.debug('Establishing broadhash consensus after sync');
				return modules.transport.getPeers(
					{ limit: constants.maxPeers },
					seriesCb
				);
			},
		},
		err => {
			__private.isActive = false;
			__private.syncTrigger(false);
			__private.blocksToSync = 0;

			library.logger.info('Finished sync');
			library.bus.message('syncFinished');
			return setImmediate(cb, err);
		}
	);
};

/**
 * Establishes a list of "good" peers.
 *
 * @private
 * @param {array<Peer>} peers
 * @returns {Object} height number, peers array
 * @todo Add description for the params
 */
Loader.prototype.findGoodPeers = function(peers) {
	const lastBlockHeight = modules.blocks.lastBlock.get().height;
	library.logger.trace('Good peers - received', { count: peers.length });

	peers = peers.filter(
		item =>
			// Remove unreachable peers or heights below last block height
			item != null && item.height >= lastBlockHeight
	);

	library.logger.trace('Good peers - filtered', { count: peers.length });

	// No peers found
	if (peers.length === 0) {
		return { height: 0, peers: [] };
	}
	// Order peers by descending height
	peers = peers.sort((a, b) => b.height - a.height);

	const histogram = {};
	let max = 0;
	let height;

	// Aggregate height by 2. TODO: To be changed if node latency increases?
	const aggregation = 2;

	// Perform histogram calculation, together with histogram maximum
	for (const i in peers) {
		const val = parseInt(peers[i].height / aggregation) * aggregation;
		histogram[val] = (histogram[val] ? histogram[val] : 0) + 1;

		if (histogram[val] > max) {
			max = histogram[val];
			height = val;
		}
	}

	// Perform histogram cut of peers too far from histogram maximum
	peers = peers
		.filter(item => item && Math.abs(height - item.height) < aggregation + 1)
		.map(item => library.logic.peers.create(item));

	library.logger.trace('Good peers - accepted', { count: peers.length });
	library.logger.debug(
		'Good peers',
		peers.map(peer => `${peer.ip}.${peer.wsPort}`)
	);

	return { height, peers };
};

// Public methods
/**
 * Gets a list of "good" peers from network.
 *
 * @param {function} cb
 * @returns {setImmediateCallback} cb, err, good peers
 * @todo Add description for the params
 */
Loader.prototype.getNetwork = function(cb) {
	modules.peers.list({ normalized: false }, (err, peers) => {
		if (err) {
			return setImmediate(cb, err);
		}

		__private.network = self.findGoodPeers(peers);

		if (!__private.network.peers.length) {
			return setImmediate(cb, 'Failed to find enough good peers');
		}
		return setImmediate(cb, null, __private.network);
	});
};

/**
 * Checks if private constiable syncIntervalId has value.
 *
 * @returns {boolean} True if syncIntervalId has value
 */
Loader.prototype.syncing = function() {
	return !!__private.syncIntervalId;
};

/**
 * Checks if `modules` is loaded.
 *
 * @returns {boolean} True if `modules` is loaded
 */
Loader.prototype.isLoaded = function() {
	return !!modules;
};

/**
 * Checks private constiable loaded.
 *
 * @returns {boolean} False if not loaded
 */
Loader.prototype.loaded = function() {
	return !!__private.loaded;
};

// Events
/**
 * Pulls Transactions and signatures.
 *
 * @returns {function} Calling __private.syncTimer()
 */
Loader.prototype.onPeersReady = function() {
	library.logger.trace('Peers ready', { module: 'loader' });
	// Enforce sync early
	__private.syncTimer();

	setImmediate(() => {
		async.series(
			{
				loadTransactions(seriesCb) {
					if (__private.loaded) {
						async.retry(__private.retries, __private.loadTransactions, err => {
							if (err) {
								library.logger.log('Unconfirmed transactions loader', err);
							}

							return setImmediate(seriesCb);
						});
					} else {
						return setImmediate(seriesCb);
					}
				},
				loadSignatures(seriesCb) {
					if (__private.loaded) {
						async.retry(__private.retries, __private.loadSignatures, err => {
							if (err) {
								library.logger.log('Signatures loader', err);
							}

							return setImmediate(seriesCb);
						});
					} else {
						return setImmediate(seriesCb);
					}
				},
			},
			err => {
				library.logger.trace('Transactions and signatures pulled', err);
			}
		);
	});
};

/**
 * Assigns needed modules from scope to private modules constiable.
 *
 * @param {modules} scope
 * @returns {function} Calling __private.loadBlockChain
 * @todo Add description for the params
 */
Loader.prototype.onBind = function(scope) {
	modules = {
		transactions: scope.transactions,
		blocks: scope.blocks,
		peers: scope.peers,
		rounds: scope.rounds,
		transport: scope.transport,
		multisignatures: scope.multisignatures,
		system: scope.system,
	};

	definitions = scope.swagger.definitions;

	__private.loadBlockChain();
};

/**
 * Sets private constiable loaded to true.
 */
Loader.prototype.onBlockchainReady = function() {
	__private.loaded = true;
};

/**
 * Sets private constiable loaded to false.
 *
 * @param {function} cb
 * @returns {setImmediateCallback} cb
 * @todo Add description for the params
 */
Loader.prototype.cleanup = function(cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

// Export
module.exports = Loader;
