'use strict';

var parallelTests = require('../../../common/parallelTests').parallelTests;

var pathFiles = [
	'./accounts',
	'./blocks',
	'./dapps',
	'./delegates',
	'./loader',
	'./multisignatures',
	'./node',
	'./peers',
	'./transactions',
	'./voters'
];

parallelTests(pathFiles, 'test/functional/http/get/');
