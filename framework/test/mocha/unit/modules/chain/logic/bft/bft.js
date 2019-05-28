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

const {
	validateBlockHeader,
} = require('../../../../../../../src/modules/chain/logic/bft');
const {
	BlockHeader: blockHeaderFixture,
} = require('../../../../../fixtures/blocks');

describe('bft', () => {
	describe('validateBlockHeader', () => {
		it('should be ok for valid headers', async () => {
			const header = blockHeaderFixture();
			expect(validateBlockHeader(header)).to.be.true;
		});

		it('should throw error if any header is not valid format', async () => {
			let header;

			// Setting non-integer value
			header = blockHeaderFixture({ height: '1' });
			expect(() => validateBlockHeader(header)).to.throw(
				'Schema validation error'
			);

			// Setting invalid id
			header = blockHeaderFixture({ blockId: 'Al123' });
			expect(() => validateBlockHeader(header)).to.throw(
				'Schema validation error'
			);

			// Setting invalid public key;
			header = blockHeaderFixture({ delegatePublicKey: 'abdef' });
			expect(() => validateBlockHeader(header)).to.throw(
				'Schema validation error'
			);
		});
	});
});
