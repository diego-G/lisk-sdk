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

const _ = require('lodash');
const { hash } = require('@liskhq/lisk-cryptography');
const { storageRead, dbRead } = require('./block');

/**
 * Generates a list of full blocks structured as full_blocks_list DB view
 * db.blocks.loadBlocksData used to return the raw full_blocks_list fields and peers expect to receive this schema
 * After replacing db.blocks for storage.entities.Block, this parser was required to transfor storage object to the expected format.
 * This should be removed along with https://github.com/LiskHQ/lisk/issues/2424 implementation
 *
 * @param {Object} ExtendedBlock - Storage ExtendedBlock object
 * @returns {Array} Array of transactions with block data formated as full_blocks_list db view
 */
const parseStorageObjToLegacyObj = block => {
	const parsedBlocks = [];
	let transactions = [{}];

	if (Array.isArray(block.transactions) && block.transactions.length > 0) {
		transactions = block.transactions;
	}

	/* eslint-disable no-restricted-globals */
	transactions.forEach(t => {
		parsedBlocks.push({
			b_id: _.get(block, 'id', null),
			b_version: isNaN(+block.version) ? null : +block.version,
			b_timestamp: isNaN(+block.timestamp) ? null : +block.timestamp,
			b_height: isNaN(+block.height) ? null : +block.height,
			b_previousBlock: _.get(block, 'previousBlockId', null),
			b_numberOfTransactions: isNaN(+block.numberOfTransactions)
				? null
				: +block.numberOfTransactions,
			b_totalAmount: _.get(block, 'totalAmount', null),
			b_totalFee: _.get(block, 'totalFee', null),
			b_reward: _.get(block, 'reward', null),
			b_payloadLength: isNaN(+block.payloadLength)
				? null
				: +block.payloadLength,
			b_payloadHash: _.get(block, 'payloadHash', null),
			b_generatorPublicKey: _.get(block, 'generatorPublicKey', null),
			b_blockSignature: _.get(block, 'blockSignature', null),
			t_id: _.get(t, 'id', null),
			t_type: _.get(t, 'type', null),
			t_timestamp: _.get(t, 'timestamp', null),
			t_senderPublicKey: _.get(t, 'senderPublicKey', null),
			t_senderId: _.get(t, 'senderId', null),
			t_recipientId: _.get(t, 'recipientId', null),
			t_amount: _.get(t, 'amount', null),
			t_fee: _.get(t, 'fee', null),
			t_signature: _.get(t, 'signature', null),
			t_signSignature: _.get(t, 'signSignature', null),
			t_requesterPublicKey: _.get(t, 'requesterPublicKey', null),
			t_signatures: t.signatures ? t.signatures.join(',') : null,
			tf_data: _.get(t, 'asset.data', null),
			s_publicKey: _.get(t, 'asset.signature.publicKey', null),
			d_username: _.get(t, 'asset.delegate.username', null),
			v_votes: t.asset && t.asset.votes ? t.asset.votes.join(',') : null,
			m_min: _.get(t, 'asset.multisignature.min', null),
			m_lifetime: _.get(t, 'asset.multisignature.lifetime', null),
			m_keysgroup:
				t.asset && t.asset.multisignature && t.asset.multisignature.keysgroup
					? t.asset.multisignature.keysgroup.join(',')
					: null,
			dapp_name: _.get(t, 'asset.dapp.name', null),
			dapp_description: _.get(t, 'asset.dapp.description', null),
			dapp_tags: _.get(t, 'asset.dapp.tags', null),
			dapp_type: _.get(t, 'asset.dapp.type', null),
			dapp_link: _.get(t, 'asset.dapp.link', null),
			dapp_category: _.get(t, 'asset.dapp.category', null),
			dapp_icon: _.get(t, 'asset.dapp.icon', null),
			in_dappId: _.get(t, 'asset.inTransfer.dappId', null),
			ot_dappId: _.get(t, 'asset.outTransfer.dappId', null),
			ot_outTransactionId: _.get(t, 'asset.outTransfer.transactionId', null),
		});
	});

	return parsedBlocks;
};

/**
 * Generates a list of full blocks for another node upon sync request from that node, see: modules.transport.internal.blocks.
 * NOTE: changing the original method loadBlocksData() could potentially change behaviour (popLastBlock() uses it for instance)
 * so that's why this new method was added
 * @param {Object} filter - Filter options
 * @param {Object} filter.limit - Limit blocks to amount
 * @param {Object} filter.lastId - ID of block to begin with
 * @param {function} cb - Callback function
 * @param {Object} tx - database transaction
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.rows - List of blocks
 */
// eslint-disable-next-line class-methods-use-this
const loadBlocksDataWS = async (storage, filter, tx) => {
	const params = { limit: filter.limit || 1 };

	// FIXME: filter.id is not used
	if (filter.id && filter.lastId) {
		throw new Error('Invalid filter: Received both id and lastId');
	}
	if (filter.id) {
		params.id = filter.id;
	} else if (filter.lastId) {
		params.lastId = filter.lastId;
	}

	// Get height of block with supplied ID
	const rows = await storage.entities.Block.get(
		{ id: filter.lastId || null },
		{ limit: params.limit },
		tx
	);
	if (!rows.length) {
		throw new Error('Invalid lastBlockId requested');
	}

	const height = rows.length ? rows[0].height : 0;
	// Calculate max block height for database query
	const realLimit = height + (parseInt(filter.limit) || 1);

	params.limit = realLimit;
	params.height = height;

	const mergedParams = Object.assign({}, filter, params);
	const queryFilters = {};

	if (!mergedParams.id && !mergedParams.lastId) {
		queryFilters.height_lt = mergedParams.limit;
	}

	if (mergedParams.id) {
		queryFilters.id = mergedParams.id;
	}

	if (mergedParams.lastId) {
		queryFilters.height_gt = mergedParams.height;
		queryFilters.height_lt = mergedParams.limit;
	}
	const blockRows = await storage.entities.Block.get(
		queryFilters,
		{
			extended: true,
			limit: null,
			sort: ['height'],
		},
		tx
	);

	let parsedBlocks = [];
	blockRows.forEach(block => {
		parsedBlocks = parsedBlocks.concat(
			parseStorageObjToLegacyObj(block)
		);
	});
	return parsedBlocks;
};

/**
 * Generates a list of full blocks for another node upon sync request from that node, see: modules.transport.internal.blocks.
 *
 * @param {Object} filter - Filter options
 * @param {Object} filter.limit - Limit blocks to amount
 * @param {Object} filter.lastId - ID of block to begin with
 * @param {function} cb - Callback function
 * @param {Object} tx - database transaction
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.rows - List of blocks
 */
const loadBlocksData = async (storage, filter, tx) => {
	const params = { limit: filter.limit || 1 };

	// FIXME: filter.id is not used
	if (filter.id && filter.lastId) {
		throw new Error('Invalid filter: Received both id and lastId');
	}
	if (filter.id) {
		params.id = filter.id;
	} else if (filter.lastId) {
		params.lastId = filter.lastId;
	}
	const rows = await storage.entities.Block.get(
		{ id: filter.lastId || null },
		{ limit: params.limit },
		tx
	);

	const height = rows.length ? rows[0].height : 0;
	// Calculate max block height for database query
	const realLimit = height + (parseInt(filter.limit) || 1);

	params.limit = realLimit;
	params.height = height;

	const mergedParams = Object.assign({}, filter, params);
	const queryFilters = {};

	if (!mergedParams.id && !mergedParams.lastId) {
		queryFilters.height_lt = mergedParams.limit;
	}

	if (mergedParams.id) {
		queryFilters.id = mergedParams.id;
	}

	if (mergedParams.lastId) {
		queryFilters.height_gt = mergedParams.height;
		queryFilters.height_lt = mergedParams.limit;
	}

	// Retrieve blocks from database
	const blockRows = await storage.entities.Block.get(
		queryFilters,
		{
			extended: true,
			limit: null,
			sort: ['height'],
		},
		tx
	);
	let parsedBlocks = [];
	blockRows.forEach(block => {
		parsedBlocks = parsedBlocks.concat(
			parseStorageObjToLegacyObj(block)
		);
	});
	return parsedBlocks;
};

/**
 * Load full block with a particular height
 *
 * @param {number} height - Block height
 * @param {function} cb - Callback function
 * @param {object} tx - Database transaction object
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.block - Block with requested height
 */
/**
 * Normalize blocks and their transactions.
 *
 * @param {Array} rows - Data from extended block entity
 * @returns {Array} blocks - List of normalized blocks with transactions
 */
const readStorageRows = (rows, transactionManager, genesisBlock) => {
	const blocks = rows.map(block => {
		// Normalize block
		// FIXME: Can have poor performance because it performs SHA256 hash calculation for each block
		block = storageRead(block);

		if (block) {
			if (block.id === genesisBlock.block.id) {
				// Generate fake signature for genesis block
				block.generationSignature = new Array(65).join('0');
			}

			// Normalize transaction
			if (block.transactions) {
				block.transactions = transactionManager.fromBlock(block);
			}
		}
		return block;
	});

	return blocks;
};

/**
 * Normalize blocks and their transactions.
 *
 * @param {Array} rows - Data from full_blocks_list view
 * @returns {Array} blocks - List of normalized blocks with transactions
 */

const readDbRows = (rows, transactionManager, genesisBlock) => {
	let blocks = {};
	const order = [];

	for (let i = 0, length = rows.length; i < length; i++) {
		// Normalize block
		// FIXME: Can have poor performance because it performs SHA256 hash calculation for each block
		const block = dbRead(rows[i]);

		if (block) {
			// If block is not already in the list...
			if (!blocks[block.id]) {
				if (block.id === genesisBlock.block.id) {
					// Generate fake signature for genesis block
					block.generationSignature = new Array(65).join('0');
				}

				// Add block ID to order list
				order.push(block.id);
				// Add block to list
				blocks[block.id] = block;
			}

			// Normalize transaction
			const transaction = transactionManager.dbRead(rows[i]);
			// Set empty object if there are no transactions in block
			blocks[block.id].transactions = blocks[block.id].transactions || {};

			if (transaction) {
				// Add transaction to block if not there already
				if (!blocks[block.id].transactions[transaction.id]) {
					blocks[block.id].transactions[transaction.id] = transaction;
				}
			}
		}
	}

	// Reorganize list
	blocks = order.map(v => {
		blocks[v].transactions = Object.keys(blocks[v].transactions).map(
			t => blocks[v].transactions[t]
		);
		return blocks[v];
	});

	return blocks;
};

/**
 * Loads full blocks from database and normalize them.
 *
 * @param {Object} filter - Filter options
 * @param {Object} filter.limit - Limit blocks to amount
 * @param {Object} filter.lastId - ID of block to begin with
 * @param {function} cb - Callback function
 * @param {Object} tx - database transaction
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.rows - List of normalized blocks
 */
const loadBlocksPart = async (storage, filter, tx) => {
	const rows = await loadBlocksData(storage, filter, tx);
	return readDbRows(rows);
};

/**
 * Loads full normalized last block from database, see: loader.loadBlockChain (private).
 *
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error message if error occurred
 * @returns {Object} cb.block - Full normalized last block
 */
const loadLastBlock = async (storage, transactionManager, genesisBlock) => {
	// Get full last block from database
	// FIXME: Review SQL order by clause
	const rows = await storage.entities.Block.get(
		{},
		{ sort: 'height:desc', limit: 1, extended: true }
	);
	// Normalize block
	return readStorageRows(rows, transactionManager, genesisBlock)[0];

	// Update last block
	// TODO: Update from callee
	// modules.blocks.lastBlock.set(block);
};

/**
 * Get blocks IDs sequence - last block ID, IDs of first blocks of last 5 rounds, genesis block ID.
 *
 * @param {number} height - Block height
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.res - Result
 * @returns {string} cb.res.firstHeight - Height of last block
 * @returns {string} cb.res.ids - Comma separated list of blocks IDs
 */
const getIdSequence = async (storage, height, lastBlock, genesisBlock, numberOfDelegates) => {
	// Get IDs of first blocks of (n) last rounds, descending order
	// EXAMPLE: For height 2000000 (round 19802) we will get IDs of blocks at height: 1999902, 1999801, 1999700, 1999599, 1999498
	const rows = await storage.entities.Block.getFirstBlockIdOfLastRounds({
		height,
		numberOfRounds: 5,
		numberOfDelegates,
	});
	if (rows.length === 0) {
		throw new Error(`Failed to get id sequence for height: ${height}`);
	}

	const ids = [];

	// Add genesis block at the end if the set doesn't contain it already
	if (genesisBlock && genesisBlock.block) {
		const __genesisBlock = {
			id: genesisBlock.block.id,
			height: genesisBlock.block.height,
		};

		if (!_.includes(rows, __genesisBlock.id)) {
			rows.push(__genesisBlock);
		}
	}

	// Add last block at the beginning if the set doesn't contain it already
	if (lastBlock && !_.includes(rows, lastBlock.id)) {
		rows.unshift({
			id: lastBlock.id,
			height: lastBlock.height,
		});
	}

	// Extract blocks IDs
	rows.forEach(row => {
		// FIXME: Looks like double check
		if (!_.includes(ids, row.id)) {
			ids.push(row.id);
		}
	});

	return {
		firstHeight: rows[0].height,
		ids: ids.join(),
	};
};

/**
 * Load full block with a particular height
 *
 * @param {number} height - Block height
 * @param {object} tx - Database transaction object
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.block - Block with requested height
 */
const loadBlockByHeight = async (storage, height, transactionManager, genesisBlock, tx) => {
	const row = await storage.entities.Block.getOne({ height }, { extended: true }, tx);
	return readStorageRows([row], transactionManager, genesisBlock)[0];
};
/**
 * Calculate broadhash getting the last 5 blocks from the database
 *
 * @returns {height, broadhash} broadhash and height
 *
 */
const calculateNewBroadhash = async (storage, nethash, height) => {
	const blocks = await storage.entities.Block.get(
		{},
		{
			limit: 5,
			sort: 'height:desc',
		}
	);

	if (blocks.length <= 1) {
		return {
			broadhash: nethash,
			height,
		};
	}
	const seed = blocks.map(row => row.id).join('');
	const broadhash = hash(seed, 'utf8').toString('hex');
	const blockHeight = blocks[0].height;
	return { broadhash, height: blockHeight };
};

module.exports = {
	parseStorageObjToLegacyObj,
	loadBlocksDataWS,
	loadBlocksData,
	readStorageRows,
	readDbRows,
	loadBlocksPart,
	loadLastBlock,
	getIdSequence,
	loadBlockByHeight,
	calculateNewBroadhash,
};
