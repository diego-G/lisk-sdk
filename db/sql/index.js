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

const { link } = require('./config');

/**
 * @namespace sql
 * @memberof db
 * @see Parent: {@link db}
 * @property {module:db/sql} SQL
 */

/**
 * Description of the module.
 *
 * @module db/sql
 * @see Parent: {@link db.sql}
 */
module.exports = {
	accounts: {},
	blocks: {
		aggregateBlocksReward: link('blocks/aggregate_blocks_reward.sql'),
		count: link('blocks/count.sql'),
		deleteBlock: link('blocks/delete_block.sql'),
		deleteBlocksAfterHeight: link('blocks/delete_blocks_after_height.sql'),
		getGenesisBlock: link('blocks/get_genesis_block.sql'),
		getGenesisBlockId: link('blocks/get_genesis_block_id.sql'),
		getIdSequence: link('blocks/get_id_sequence.sql'),
		loadBlocksOffset: link('blocks/load_blocks_offset.sql'),
		loadLastBlock: link('blocks/load_last_block.sql'),
		loadLastNBlockIds: link('blocks/load_last_n_block_ids.sql'),
		blockExists: link('blocks/block_exists.sql'),
		deleteAfterBlock: link('blocks/delete_after_block.sql'),
		getBlockForTransport: link('blocks/get_block_for_transport.sql'),
		getHeightByLastId: link('blocks/get_height_by_last_id.sql'),
		getCommonBlock: link('blocks/get_common_block.sql'),
	},
	multisignatures: {
		getMemberPublicKeys: link('multisignatures/get_member_public_keys.sql'),
		getGroupIds: link('multisignatures/get_group_ids.sql'),
	},
	migrations: {
		getLastId: link('migrations/get_last_id.sql'),
		add: link('migrations/add.sql'),
		runtime: link('migrations/runtime.sql'),
	},
};
