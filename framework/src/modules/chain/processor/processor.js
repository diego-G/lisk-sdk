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

const { StateStore } = require('../state_store');

const FORK_STATUS_DISCARD = 1;
const FORK_STATUS_REVERT = 2;
const FORK_STATUS_SYNC = 3;
const FORK_STATUS_REVERT_2_AND_QUIT = 4;

class Processor {
	constructor({ channel, storage, logger, blocks }) {
		this.channel = channel;
		this.storage = storage;
		this.logger = logger;
		this.blocks = blocks;
		this.processors = {};
	}

	register(processor) {
		this.processors[processor.VERSION] = processor;
	}

	async process(block) {
		const blockProcessor = this._getBlockProcessor(block);
		this._validate(block, blockProcessor);
		const { lastBlock } = this.blocks;
		const forkStatus = blockProcessor.fork.exec({
			block,
			lastBlock,
			channel: this.channel,
		});
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

		if (forkStatus === FORK_STATUS_REVERT_2_AND_QUIT) {
			await this._revert(lastBlock, blockProcessor);
			const { lastBlock: secondLastBlock } = this.blocks;
			await this._revert(secondLastBlock, blockProcessor);
			return;
		}

		await this._processValidated(block, blockProcessor);
	}

	validate(block) {
		const blockProcessor = this._getBlockProcessor(block);
		this._validate(block, blockProcessor);
	}

	async processValidated(block) {
		const blockProcessor = this._getProcessor(block);
		return this._processValidated(block, blockProcessor);
	}

	async apply(block) {
		const blockProcessor = this._getProcessor(block);
		return this._apply(block, blockProcessor);
	}

	_validate(block, processor) {
		const { lastBlock } = this.blocks;
		processor.validate.exec({
			block,
			lastBlock,
			channel: this.channel,
		});
	}

	async _processValidated(block, processor, { skipSave } = {}) {
		const stateStore = new StateStore(this.storage);
		const { lastBlock } = this.blocks;
		stateStore.createSnapshot();
		await processor.verify.exec({
			block,
			lastBlock,
			stateStore,
			channel: this.channel,
		});
		stateStore.restoreSnapshot();
		await processor.apply.exec({
			block,
			lastBlock,
			stateStore,
			channel: this.channel,
		});
		await this.storage.begin(async tx => {
			await stateStore.finalize(tx);
			if (!skipSave) {
				await this.storage.entities.Blocks.create(block);
			}
		});
	}

	async _apply(block, processor) {
		const stateStore = new StateStore(this.storage);
		const { lastBlock } = this.blocks;
		stateStore.createSnapshot();
		await processor.verify.exec({
			block,
			lastBlock,
			stateStore,
			channel: this.channel,
		});
		stateStore.restoreSnapshot();
		await processor.apply.exec({
			block,
			lastBlock,
			stateStore,
			channel: this.channel,
		});
		await this.storage.begin(async tx => {
			await stateStore.finalize(tx);
		});
	}

	async _revert(block, processor) {
		const stateStore = new StateStore(this.storage);
		const { lastBlock } = this.blocks;
		await processor.undo.exec({
			block,
			lastBlock,
			stateStore,
			channel: this.channel,
		});
		await this.storage.begin(async tx => {
			await stateStore.finalize(tx);
			await this.storage.entities.Blocks.delete(block);
		});
	}

	_getBlockProcessor(block) {
		const { version } = block;
		if (!this.processors[version]) {
			throw new Error('Block processing version is not registered');
		}
		return this.processors[version];
	}
}

module.exports = {
	Processor,
};
