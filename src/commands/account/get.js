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
import BaseCommand from '../../base';
import getAPIClient from '../../utils/api';
import query from '../../utils/query';

export default class GetCommand extends BaseCommand {
	async run() {
		const { args: { addresses } } = this.parse(GetCommand);
		const req = addresses.map(address => ({
			query: {
				limit: 1,
				address,
			},
			placeholder: {
				address,
				message: 'Address not found.',
			},
		}));
		const client = getAPIClient(this.userConfig.api);
		const results = await query(client, 'accounts', req);
		this.print(results);
	}
}

GetCommand.args = [
	{
		name: 'addresses',
		required: true,
		description: 'Comma-separated address(es) to get information about.',
		parse: input => input.split(','),
	},
];

GetCommand.flags = {
	...BaseCommand.flags,
};

GetCommand.description = `
Gets account information from the blockchain.
`;

GetCommand.examples = [
	'account:get 3520445367460290306L',
	'account:get 3520445367460290306L,2802325248134221536L',
];
