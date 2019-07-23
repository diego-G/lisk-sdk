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

const rootDir = process.cwd();

const systemDirs = appLabel => ({
	root: rootDir,
	temp: `${rootDir}/tmp/${appLabel}/`,
	sockets: `${rootDir}/tmp/${appLabel}/sockets`,
	pids: `${rootDir}/tmp/${appLabel}/pids`,
});

module.exports = systemDirs;
