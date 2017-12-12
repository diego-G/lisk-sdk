'use strict';

var parallelTests = require('../../../common/parallelTests').parallelTests;

var pathFiles = [
	'./accounts',
	'./blocks',
	'./dapps',
	'./delegates',
	'./accounts.multisignatures.js',
	'./node',
	'./node.transactions.unconfirmed',
	'./node.transactions.unprocessed',
	'./node.transactions.unsigned',
	'./peers',
	'./transactions',
	'./voters',
	'./votes'
];

parallelTests(pathFiles, 'test/functional/http/get/');
