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

const childProcess = require('child_process');
const fs = require('fs');

/**
 * Helper module for parsing git commit information.
 *
 * @module
 * @see Parent: {@link helpers}
 * @requires child_process
 */

/**
 * Returns hash of the last git commit if available.
 *
 * @returns {string} Hash of last git commit
 * @throws {Error} If cannot get last git commit
 */
function getLastCommit() {
	let spawn;

	try {
		spawn = childProcess.spawnSync('git', ['rev-parse', 'HEAD']);
		// If there is git tool available and current directory is a git owned directory
		if (!spawn.stderr.toString().trim()) {
			return spawn.stdout.toString().trim();
		}
	} catch (error) {
		// It should read REVISION file if error is that Git is not installed
		// eslint-disable-next-line no-console
		console.log(
			'When getting git rev-parse HEAD, following error happened',
			error.toString()
		);
	}

	// Try looking for a file REVISION for a compiled build
	try {
		return fs
			.readFileSync('REVISION')
			.toString()
			.trim();
	} catch (error) {
		throw new Error('Not a git repository and no revision file found.');
	}
}

module.exports = {
	getLastCommit,
};
