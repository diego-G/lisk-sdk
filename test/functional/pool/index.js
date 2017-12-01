'use strict';

var parallelTests = require('../../common/parallelTests').parallelTests;

var pathFiles = [
	'./1.X.unconfirmed/1.0.transfer',
	'./1.X.unconfirmed/1.1.second.secret',
	'./1.X.unconfirmed/1.2.delegate',
	'./1.X.unconfirmed/1.3.votes',
	'./1.X.unconfirmed/1.4.multisig',
	'./1.X.unconfirmed/1.5.dapps',
	'./1.X.unconfirmed/1.6.dapps.inTransfer',
	'./1.X.unconfirmed/1.7.dapps.outTransfer',

	'./2.delegates',

	'./4.X.unconfirmed/4.0.transfer',
	'./4.X.unconfirmed/4.1.second.secret',
	'./4.X.unconfirmed/4.2.delegate',
	'./4.X.unconfirmed/4.3.votes',
	'./4.X.unconfirmed/4.4.multisig',
	'./4.X.unconfirmed/4.5.dapps',
	'./4.X.unconfirmed/4.6.dapps.inTransfer',
	'./4.X.unconfirmed/4.7.dapps.outTransfer'
];

parallelTests(pathFiles, 'test/functional/pool/');
