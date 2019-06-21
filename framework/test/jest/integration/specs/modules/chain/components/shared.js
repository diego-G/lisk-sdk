/* eslint-disable mocha/no-pending-tests */
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

const { configurator } = require('../../../../../../../src');

const devConfig = require('../../../../../../fixtures/config/devnet/config');

// To compile and have one unified config along with defaults
configurator.loadConfig(devConfig);

module.exports = {
	config: configurator.getConfig({}, { failOnInvalidArg: false }),
};
