module.exports = function listCommand(vorpal) {
	'use strict';

	const config = require('../config');
	const lisk = require('lisk-js').api(config.liskJS);
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
		let returnType;
		switch (type) {
			case 'accounts':
			case 'addresses':
				returnType = 'account';
				break;
			case 'blocks':
				returnType = 'block';
				break;
			case 'delegates':
				returnType = 'delegate';
				break;
			case 'transactions':
				returnType = 'transaction';
				break;
		}
		return returnType;
	}

	function filterCommandForFlags (commands, input) {

		return input.filter(function (commandInput) {
			return commands.indexOf(commandInput) === -1
		});

	}

	function getFlags (commands) {
		return commands.map(function (command) {
			return command.flags;
		});
	}

	vorpal
		.command('list <type> [variadic...]')
		.option('-j, --json', 'Sets output to json')
		.option('-t, --no-json', 'Sets output to text')
		.description('Get information from <type> with parameters [input, input, ...]')
		.autocomplete(['accounts', 'addresses', 'blocks', 'delegates', 'transactions'])
		.action(function(userInput) {

			let bigNumberWorkaround = this.commandWrapper.command.split(" ");
			bigNumberWorkaround.shift();
			bigNumberWorkaround.shift();

			let flags = getFlags(this.commandObject.options).toString();
			let fixedCommands = filterCommandForFlags(flags, bigNumberWorkaround);

			let getType = {
				'addresses': isAccountQuery,
				'accounts': isAccountQuery,
				'blocks': isBlockQuery,
				'delegates': isDelegateQuery,
				'transactions': isTransactionQuery
			};

			let calls = fixedCommands.map(function (input) {
				let output = getType[userInput.type](input);
				return output;
			});


			 if(process.env.NODE_ENV === 'test') {

				 return Promise.all(calls);

			 } else {

				 //output = tablify(output).toString();

				 return Promise.all(calls).then(result => {
				 	result.map(executed => {
					    if(executed.error) {
						    vorpal.log(util.inspect(executed));
					    } else {
						    vorpal.log(util.inspect(executed[switchType(userInput.type)]));
					    }
				    });

				 	return result;

				 });

			 }


		});

};
