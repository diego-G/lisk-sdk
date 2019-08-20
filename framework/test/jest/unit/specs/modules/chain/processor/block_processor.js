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
	BlockProcessor,
} = require('../../../../../../../src/modules/chain/processor');

class FakeBlockProcessorV0 extends BlockProcessor {
	// eslint-disable-next-line class-methods-use-this
	get version() {
		return 0;
	}
}

class FakeBlockProcessorV1 extends BlockProcessor {
	// eslint-disable-next-line class-methods-use-this
	get version() {
		return 1;
	}
}

module.exports = {
	FakeBlockProcessorV0,
	FakeBlockProcessorV1,
};
