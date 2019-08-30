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

const { cloneDeep } = require('lodash');
const {
	FORK_STATUS_DISCARD,
	FORK_STATUS_REVERT,
	FORK_STATUS_SYNC,
} = require('../blocks');

class Processor {
	constructor({ channel, storage, logger, blocksModule }) {
		this.channel = channel;
		this.storage = storage;
		this.logger = logger;
		this.blocksModule = blocksModule;
		this.processors = {};
		this.matchers = {};
	}

	// register a block processor with particular version
	register(processor, { matcher } = {}) {
		this.processors[processor.version] = processor;
		this.matchers[processor.version] = matcher || (() => true);
	}

	// eslint-disable-next-line no-unused-vars,class-methods-use-this
	async init(genesisBlock) {
		// do init check for block state. We need to load the blockchain
		await this.applyGenesisBlock(genesisBlock);
		const blockProcessor = this._getBlockProcessor(genesisBlock);
		await blockProcessor.init.exec();
		this.logger.info('Blockchain ready');
	}

	// process is for standard processing of block, especially when received from network
	async process(block) {
		const blockProcessor = this._getBlockProcessor(block);
		const { lastBlock } = this.blocksModule;
		blockProcessor.validateNew.exec({
			block,
			lastBlock,
		});
		await this._validate(block, blockProcessor);
		const forkStatus = blockProcessor.fork.exec({
			block,
			lastBlock,
		});
		this.logger.info({ id: block.id }, 'Received block');
		if (forkStatus === FORK_STATUS_DISCARD) {
			this.logger.info({ id: block.id }, 'Discarding block');
			return;
		}

		if (forkStatus === FORK_STATUS_SYNC) {
			this.channel.publish('chain:process:sync');
			return;
		}

		if (forkStatus === FORK_STATUS_REVERT) {
			this.logger.info({ id: lastBlock.id }, 'Reverting block');
			await this._revert(lastBlock, blockProcessor);
		}

		await this._processValidated(block, blockProcessor);
	}

	async create(values) {
		const heghestVersion = Math.max.apply(null, Object.keys(this.processors));
		const processor = this.processors[heghestVersion];
		return processor.create.exec(values);
	}

	// validate checks the block statically
	async validate(block) {
		const blockProcessor = this._getBlockProcessor(block);
		await this._validate(block, blockProcessor);
	}

	// processValidated processes a block assuming that statically it's valid
	async processValidated(block) {
		const blockProcessor = this._getBlockProcessor(block);
		return this._processValidated(block, blockProcessor, {
			skipBroadcast: true,
		});
	}

	// apply processes a block assuming that statically it's valid without saving a block
	async apply(block) {
		const blockProcessor = this._getBlockProcessor(block);
		return this._processValidated(block, blockProcessor, {
			skipSave: true,
			skipBroadcast: true,
		});
	}

	async deleteLastBlock() {
		const { lastBlock } = this.blocksModule;
		const blockProcessor = this._getBlockProcessor(lastBlock);
		await this._revert(lastBlock, blockProcessor);
	}

	async applyGenesisBlock(block, skipSave = false) {
		const blockProcessor = this._getBlockProcessor(block);
		return this._processGenesis(block, blockProcessor, { skipSave });
	}

	async _validate(block, processor) {
		const { lastBlock } = this.blocksModule;
		const blockBytes = await processor.getBytes.exec({ block });
		await processor.validate.exec({
			block,
			lastBlock,
			blockBytes,
		});
	}

	async _processValidated(block, processor, { skipSave, skipBroadcast } = {}) {
		const blockBytes = processor.getBytes.exec({ block });
		const { lastBlock } = this.blocksModule;
		return this.storage.entities.Block.begin('Chain:processBlock', async tx => {
			await processor.verify.exec({
				block,
				blockBytes,
				lastBlock,
				tx,
			});
			if (!skipBroadcast) {
				this.channel.publish('chain:process:broadcast', {
					block: cloneDeep(block),
				});
			}
			await processor.apply.exec({
				block,
				blockBytes,
				lastBlock,
				tx,
			});
			if (!skipSave) {
				await this.blocksModule.save({ block, tx });
				this.channel.publish('chain:process:newBlock', {
					block: cloneDeep(block),
				});
			}
			return block;
		});
	}

	async _processGenesis(block, processor, { skipSave } = { skipSave: false }) {
		return this.storage.entities.Block.begin('Chain:processBlock', async tx => {
			// Check if genesis block ID already exists in the database
			const isPersisted = await this.blocksModule.exists(block);

			// If block is persisted and we don't want to save, it means that we are rebuilding. Therefore, don't return without applying block.
			if (isPersisted && !skipSave) {
				return block;
			}

			await processor.applyGenesis.exec({
				block,
				tx,
			});

			await this.blocksModule.saveGenesis({
				block,
				tx,
				skipSave,
			});

			return block;
		});
	}

	async _revert(block, processor) {
		await this.storage.entities.Block.begin('Chain:revertBlock', async tx => {
			const { lastBlock } = this.blocksModule;
			await processor.undo.exec({
				block,
				lastBlock,
				tx,
			});
			await this.blocksModule.remove({ block, tx });
			this.channel.publish('chain:process:deleteBlock', {
				block: cloneDeep(block),
			});
		});
	}

	_getBlockProcessor(block) {
		const { version } = block;
		if (!this.processors[version]) {
			throw new Error('Block processing version is not registered');
		}
		// Sort in asc order
		const matcherVersions = Object.keys(this.matchers).sort((a, b) => a - b);
		// eslint-disable-next-line no-restricted-syntax
		for (const matcherVersion of matcherVersions) {
			const matcher = this.matchers[matcherVersion];
			if (matcher(block)) {
				return this.processors[matcherVersion];
			}
		}
		throw new Error('No matching block processor found');
	}
}

module.exports = {
	Processor,
};
