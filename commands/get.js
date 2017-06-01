module.exports = function getCommand (vorpal) {
	'use strict';

	const lisk = require('lisk-js').api();
	const tablify = require('../src/utils/tablify');
	const util = require('util');

	function isAccountQuery (input) {

		return lisk.sendRequest('accounts', {  address: input });

	}

	function isBlockQuery (input) {

		return lisk.sendRequest('blocks/get', {  id: input });

	}

	function isTransactionQuery (input) {

		return lisk.sendRequest('transactions/get', {  id: input });

	}

	function isDelegateQuery (input) {

		return lisk.sendRequest('delegates/get', {  username: input });

	}

	function switchType (type) {
		return {
			'account': 'account',
			'address': 'address',
			'block': 'block',
			'delegate': 'delegate',
			'transaction': 'transaction'
		}[type];
	}

	vorpal
		.command('get <type> <input>')
		.description('Get information from <type> with parameter <input>')
		.autocomplete(['account', 'address', 'block', 'delegate', 'transaction'])
		.action(function(userInput) {

			let getType = {
				'account': isAccountQuery,
				'address': isAccountQuery,
				'block': isBlockQuery,
				'delegate': isDelegateQuery,
				'transaction': isTransactionQuery
			};

			let bigNumberWorkaround = this.commandWrapper.command.split(" ")[2];

			let output = getType[userInput.type](bigNumberWorkaround);

			if(process.env.NODE_ENV === 'test') {

				return output;

			} else {

				//output = tablify(output).toString();

				return output.then((result) => {
					if(result.error) {
						vorpal.log(util.inspect(result));
					} else {
						vorpal.log(util.inspect(result[switchType(userInput.type)]));
					}

				});

			}

		});

};
