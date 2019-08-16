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

const {
	FORK_STATUS_DISCARD,
	FORK_STATUS_REVERT,
	FORK_STATUS_SYNC,
	BLOCKCHAIN_STATUS_REBUILD,
	BLOCKCHAIN_STATUS_RECOVERY,
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
	async init(genesisBlock, { rebuildUptoRound }) {
		// do init check for block state. We need to load the blockchain
		const blockProcessor = this._getBlockProcessor(genesisBlock);
		await blockProcessor.saveGenesisBlock();
		const status = await this.blocksModule.checkBlockchainStatus();
		if (status === BLOCKCHAIN_STATUS_REBUILD) {
			// Need to fix this.
			await this.storage.entities.Account.resetMemTables();
			await this.rebuild();
		}

		if (status === BLOCKCHAIN_STATUS_RECOVERY) {
			// start recover
			await this.recovery();
		}

		// status === BLOCKCHAIN_STATUS_READY
		this.logger.info('Blockchain ready');
	}

	async rebuild(
		{ targetHeight, isCleaning, onProgress, loadPerIteration } = {
			loadPerIteration: 1000,
		},
	) {
		const limit = loadPerIteration;
		let { lastBlock } = this.blocksModule;
		for (
			let currentHeight = 0;
			currentHeight < targetHeight;
			currentHeight += loadPerIteration
		) {
			if (isCleaning()) {
				break;
			}
			// if rebuildUptoRound is undefined, use the highest height
			// eslint-disable-next-line no-await-in-loop
			const blocks = await this.blocksModule.blocksUtils.loadBlocksWithOffset(
				this.storage,
				this.interfaceAdapters,
				this.genesisBlock,
				limit,
				currentHeight,
			);
			// eslint-disable-next-line no-restricted-syntax
			for (const block of blocks) {
				if (isCleaning() || block.height > targetHeight) {
					break;
				}
				if (block.id === this.genesisBlock.id) {
					// eslint-disable-next-line no-await-in-loop
					lastBlock = await this.applyGenesisBlock(block);
					onProgress(lastBlock);
				}

				if (block.id !== this.genesisBlock.id) {
					// eslint-disable-next-line no-await-in-loop
					lastBlock = await this.applyBlock(block, lastBlock);
				}
				onProgress(lastBlock);
			}
		}

		return lastBlock;
	}

	async applyGenesisBlock(block) {
		const blockProcessor = this._getBlockProcessor(block);
		return blockProcessor.applyGenesisBlock(block);
	}

	// process is for standard processing of block, especially when received from network
	async process(block) {
		const blockProcessor = this._getBlockProcessor(block);
		const { lastBlock } = this.blocksModule;
		blockProcessor.validateNew.exec({
			block,
			lastBlock,
			channel: this.channel,
		});
		await this._validate(block, blockProcessor);
		const forkStatus = blockProcessor.fork.exec({
			block,
			lastBlock,
			channel: this.channel,
		});
		this.logger.info(`Received block with id: ${block.id}`);
		if (forkStatus === FORK_STATUS_DISCARD) {
			return;
		}

		if (forkStatus === FORK_STATUS_SYNC) {
			this.channel.publish('chain:process:sync');
			return;
		}

		if (forkStatus === FORK_STATUS_REVERT) {
			await this._revert(lastBlock, blockProcessor);
		}

		await this._processValidated(block, blockProcessor);
	}

	create(values) {
		const heghestVersion = Math.max.apply(null, Object.keys(this.processors));
		const processor = this.processors[heghestVersion];
		return processor.create.execSync(values);
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

	async _validate(block, processor) {
		const { lastBlock } = this.blocksModule;
		const blockBytes = processor.getBytes.execSync({ block });
		await processor.validate.exec({
			block,
			lastBlock,
			blockBytes,
			channel: this.channel,
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
				channel: this.channel,
			});
			if (!skipBroadcast) {
				this.blocksModule.broadcast(block);
			}
			await processor.apply.exec({
				block,
				blockBytes,
				lastBlock,
				tx,
				channel: this.channel,
			});
			if (!skipSave) {
				await this.blocksModule.save({ block, tx });
			}
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
				channel: this.channel,
			});
			await this.blocksModule.remove({ block, tx });
		});
	}

	async deleteLastBlock() {
		const { lastBlock } = this.blocksModule;
		const blockProcessor = this._getBlockProcessor(lastBlock);
		await this._revert(lastBlock, blockProcessor);
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
