/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
 *
 */
import commonOptions from '../utils/options';
import query from '../utils/query';
import { COMMAND_TYPES } from '../utils/constants';
import { printResult } from '../utils/print';
import { deAlias } from '../utils/helpers';

const description = `Get information from <type> with parameter <input>. Types available: account, address, block, delegate, transaction.

	Examples:
		- get delegate lightcurve
		- get block 5510510593472232540
`;

const handlers = {
	account: account => query.isAccountQuery(account),
	address: address => query.isAccountQuery(address),
	block: block => query.isBlockQuery(block),
	delegate: delegate => query.isDelegateQuery(delegate),
	transaction: transaction => query.isTransactionQuery(transaction),
};

const processResult = (vorpal, options, type, result) => {
	const resultToPrint = result.error ? result : result[type];
	return printResult(vorpal, options)(resultToPrint);
};

const get = vorpal => ({ options, type, input }) => (
	COMMAND_TYPES.includes(type)
		? handlers[type](input)
			.then(processResult.bind(null, vorpal, options, deAlias(type)))
		: Promise.resolve(vorpal.activeCommand.log('Unsupported type.'))
);

export default function getCommand(vorpal) {
	vorpal
		.command('get <type> <input>')
		.option(...commonOptions.json)
		.option(...commonOptions.noJson)
		.description(description)
		.autocomplete(COMMAND_TYPES)
		.action(get(vorpal));
}
