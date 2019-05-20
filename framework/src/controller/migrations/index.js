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

const path = require('path');

const migrations = [
	path.join(path.dirname(__filename), './sql/20160723182900_create_schema.sql'),
	path.join(
		path.dirname(__filename),
		'./sql/20180205000000_underscore_patch.sql'
	),
];

module.exports = {
	MigrationEntity: require('./migration'),
	migrations,
};
