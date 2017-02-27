/**
 * Index module comprising all submodules of lisk-js.
 * @module lisk
 */

global.naclFactory = require('js-nacl');

global.naclInstance;
naclFactory.instantiate(function (nacl) {
	naclInstance = nacl;
});

lisk = {

	crypto : require("./lib/transactions/crypto.js"),
	newcrypto: require('./lib/transactions/crypto/index'),
	dapp: require("./lib/transactions/dapp.js"),
	delegate : require("./lib/transactions/delegate.js"),
	multisignature : require("./lib/transactions/multisignature.js"),
	signature : require("./lib/transactions/signature.js"),
	transaction : require("./lib/transactions/transaction.js"),
	vote : require("./lib/transactions/vote.js")
}

module.exports = lisk;
