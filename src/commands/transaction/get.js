/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import { flags as flagParser } from '@oclif/command';
import BaseCommand from '../../base';
import getAPIClient from '../../utils/api';
import query from '../../utils/query';

const stateFlag = {
	char: 's',
	description: `Get transactions based on given transaction ids and state. Possible values for the state are "unsigned" and "unprocessed".
	Examples:
	- --state=unsigned
	- --state=unprocessed
`,
};

const handleResponse = (res, placeholder) => {
	// Get endpoints with 2xx status code should always return with data key.
	if (!res.data) {
		throw new Error('No data was returned.');
	}
	if (Array.isArray(res.data)) {
		if (res.data.length === 0) {
			if (placeholder) {
				return placeholder;
			}
			throw new Error('No transaction found with specified parameters.');
		}
		return res.data[0];
	}
	return res.data;
};

const queryNode = async (client, txnState, parameters) =>
	Array.isArray(parameters)
		? Promise.all(
				parameters.map(param =>
					client
						.getTransactions(txnState, param.query)
						.then(res => handleResponse(res, param.placeholder)),
				),
			)
		: client
				.getTransactions(txnState, parameters.query)
				.then(res => handleResponse(res, parameters.placeholder));

export default class GetCommand extends BaseCommand {
	async run() {
		const { args: { ids }, flags: { state: txnState } } = this.parse(
			GetCommand,
		);
		const req = ids.map(id => ({
			query: {
				limit: 1,
				id,
			},
			placeholder: {
				id,
				message: 'Transaction not found.',
			},
		}));

		const client = getAPIClient(this.userConfig.api);

		if (txnState && txnState === 'unsigned') {
			const results = await queryNode(client.node, txnState, req);
			return this.print(results);
		}
		if (txnState && txnState === 'unprocessed') {
			const results = await queryNode(client.node, txnState, req);
			return this.print(results);
		}
		const results = await query(client, 'transactions', req);

		return this.print(results);
	}
}

GetCommand.args = [
	{
		name: 'ids',
		required: true,
		description: 'Comma-separated transaction ID(s) to get information about.',
		parse: input => input.split(',').filter(Boolean),
	},
];

GetCommand.flags = {
	...BaseCommand.flags,
	state: flagParser.string(stateFlag),
};

GetCommand.description = `
Gets transaction information from the blockchain.
`;

GetCommand.examples = [
	'transaction:get 10041151099734832021',
	'transaction:get 10041151099734832021,1260076503909567890',
	'transaction:get 10041151099734832021,1260076503909567890 --state=unprocessed',
];
