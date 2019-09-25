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
	restoreBlocks,
} = require('../../../../../../../src/modules/chain/synchronizer/utils');

describe('#synchronizer/utils', () => {
	let blocksMock;
	let processorMock;
	const stubs = {};

	beforeEach(async () => {
		blocksMock = {
			getTempBlocks: jest.fn(),
		};

		processorMock = {
			processValidated: jest.fn(),
		};

		stubs.tx = jest.fn();
	});

	describe('restoreBlocks()', () => {
		it('should return true on success', async () => {
			// Arrange
			const blocks = [{ id: 'block1' }, { id: 'block2' }];
			blocksMock.getTempBlocks = jest.fn().mockReturnValue(blocks);

			// Act
			const result = await restoreBlocks(blocksMock, processorMock, stubs.tx);

			// Assert
			expect(blocksMock.getTempBlocks).toHaveBeenCalledWith(stubs.tx);
			expect(processorMock.processValidated).toHaveBeenCalledTimes(2);
			expect(processorMock.processValidated).toHaveBeenNthCalledWith(
				1,
				blocks[0],
				true,
			);
			expect(processorMock.processValidated).toHaveBeenNthCalledWith(
				2,
				blocks[1],
				true,
			);
			expect(result).toBeTrue();
		});

		it('should throw error when temp_block table is empty', async () => {
			// Arrange
			blocksMock.getTempBlocks = jest.fn().mockReturnValue([]);

			// Act && Assert
			await expect(
				restoreBlocks(blocksMock, processorMock, stubs.tx),
			).rejects.toEqual(new Error('Temp_block table is empty'));
			expect(blocksMock.getTempBlocks).toHaveBeenCalledWith(stubs.tx);
			expect(processorMock.processValidated).not.toHaveBeenCalled();
		});
	});
});
