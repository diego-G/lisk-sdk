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
import * as transactions from '@liskhq/lisk-transactions';
import BaseCommand from '../../../base';
import { flags as commonFlags } from '../../../utils/flags';
import { getInputsFromSources } from '../../../utils/input';

const dataFlag = {
	char: 'd',
	description: `Optional UTF8 encoded data (maximum of 64 bytes) to include in the transaction asset.
	Examples:
	- --data=customInformation
`,
};

const processInputs = (amount, address, data) => ({
	passphrase,
	secondPassphrase,
}) =>
	transactions.transfer({
		recipientId: address,
		amount,
		data,
		passphrase,
		secondPassphrase,
	});

export default class TransferCommand extends BaseCommand {
	async run() {
		const {
			args: { amount, address },
			flags: {
				passphrase: passphraseSource,
				'second-passphrase': secondPassphraseSource,
				'no-signature': noSignature,
				data: dataString,
			},
		} = this.parse(TransferCommand);

		transactions.utils.validateAddress(address);
		const normalizedAmount = transactions.utils.convertLSKToBeddows(amount);

		const processFunction = processInputs(
			normalizedAmount,
			address,
			dataString,
		);

		if (noSignature) {
			const result = processFunction({
				passphrase: null,
				secondPassphrase: null,
			});
			return this.print(result);
		}

		const inputs = await getInputsFromSources({
			passphrase: {
				source: passphraseSource,
				repeatPrompt: true,
			},
			secondPassphrase: !secondPassphraseSource
				? null
				: {
						source: secondPassphraseSource,
						repeatPrompt: true,
					},
		});
		const result = processFunction(inputs);
		return this.print(result);
	}
}

TransferCommand.args = [
	{
		name: 'amount',
		required: true,
		description: 'Amount of LSK to send.',
	},
	{
		name: 'address',
		required: true,
		description: 'Address of the recipient.',
	},
];

TransferCommand.flags = {
	...BaseCommand.flags,
	passphrase: flagParser.string(commonFlags.passphrase),
	'second-passphrase': flagParser.string(commonFlags.secondPassphrase),
	'no-signature': flagParser.boolean(commonFlags.noSignature),
	data: flagParser.string(dataFlag),
};

TransferCommand.description = `
Creates a transaction which will transfer the specified amount to an address if broadcast to the network.
	`;

TransferCommand.examples = [
	'transaction:create:transfer 100 13356260975429434553L',
];
