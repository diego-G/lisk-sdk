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

var childProcess = require('child_process');
var Logger = require('../../../logger');

module.exports = {
	http: require('./http'),
	ws: require('./ws'),
	transactions: require('./transactions'),
	logger: new Logger({
		filename: `${__dirname}/integrationTestsLogger.logs`,
		echo: 'log',
	}),
	getOpenConnections: (ports, cb) => {
		// lsof -i :5000 -i :5001 -P -n | wc -l
		childProcess.exec(
			`lsof ${ports.map(p => `-i :${p}`).join(' ')} -P -n | wc -l`,
			(err, stdout) => {
				cb(err, parseInt(stdout.toString().trim()));
			}
		);
	},
	getListeningConnections: (ports, cb) => {
		// lsof -i :5000 -i :5001 -P -n -s TCP:LISTEN -t | wc -l
		// -t to strip the headers of lsof so we can count the rows
		childProcess.exec(
			`lsof ${ports
				.map(p => `-i :${p}`)
				.join(' ')} -P -n -s TCP:LISTEN -t | wc -l`,
			(err, stdout) => {
				cb(err, parseInt(stdout.toString().trim()));
			}
		);
	},
	getEstablishedConnections: (ports, cb) => {
		// lsof -i :5000 -i :5001 -P -n -s TCP:ESTABLISHED  -t | wc -l
		// -t to strip the headers of lsof so we can count the rows
		childProcess.exec(
			`lsof ${ports
				.map(p => `-i :${p}`)
				.join(' ')} -P -n -s TCP:ESTABLISHED -t | wc -l`,
			(err, stdout) => {
				cb(err, parseInt(stdout.toString().trim()));
			}
		);
	},
};
