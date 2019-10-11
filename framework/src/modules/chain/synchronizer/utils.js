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

/**
 * Restore blocks from temp table and re-apply to chain
 * Steps:
 * 1. Read all blocks from temp_block table
 * 2. Apply blocks one by one to current chain
 * 3. Each block gets deleted from temp_block table when its being applied
 *
 * @param {Object} blocksModule - injection of blocks module object
 * @param {Object} processorModule - injection of processor module object
 * @param {Object} tx - database transaction
 * @return {Promise<Boolean>} - returns true when successfully restoring blocks, returns false if no blocks were found
 */
const restoreBlocks = async (blocksModule, processorModule, tx) => {
	const tempBlocks = await blocksModule.getTempBlocks(tx);

	if (tempBlocks.length === 0) {
		return false;
	}

	for (const block of tempBlocks) {
		await processorModule.processValidated(block, {
			removeFromTempTable: true,
		});
	}

	return true;
};

/**
 * Deletes blocks of the current chain after the desired height exclusive and
 * backs them up in temp_block database table.
 * @param {Object} processorModule
 * @param {Object} blocksModule
 * @param {Number} desiredHeight - The height desired to delete blocks after.
 * @return {Promise<void>} - Promise is resolved when blocks are successfully deleted
 */
const deleteBlocksAfterHeightAndBackup = async (
	logger,
	processorModule,
	blocksModule,
	desiredHeight,
) => {
	logger.debug(
		{ height: desiredHeight },
		'Deleting blocks after target height',
	);
	let { height: currentHeight } = blocksModule.lastBlock;
	while (desiredHeight > currentHeight) {
		const lastBlock = await processorModule.deleteLastBlock({
			saveTempBlock: true,
		});
		currentHeight = lastBlock.height;
	}

	logger.debug('Blocks deleted successfully');
};

/**
 * Returns a list of block heights corresponding to the first block of a defined number
 * of rounds (listSizeLimit)
 *
 * @param finalizedHeight
 * @param activeDelegates
 * @param listSizeLimit - The size of the array to be computed
 * @param currentRound
 * @return {Array<string>}
 * @private
 */
const computeBlockHeightsList = (
	finalizedHeight,
	activeDelegates,
	listSizeLimit,
	currentRound,
) => {
	const startingHeight = Math.max(1, (currentRound - 1) * activeDelegates);
	const heightList = new Array(listSizeLimit)
		.fill(0)
		.map((_, i) => startingHeight - i * activeDelegates)
		.filter(height => height > 0);
	const heightListAfterFinalized = heightList.filter(
		height => height > finalizedHeight,
	);
	return heightList.length !== heightListAfterFinalized.length
		? [...heightListAfterFinalized, finalizedHeight]
		: heightListAfterFinalized;
};

module.exports = {
	restoreBlocks,
	deleteBlocksAfterHeightAndBackup,
	computeBlockHeightsList,
};
