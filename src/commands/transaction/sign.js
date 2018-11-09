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
import transactions from '@liskhq/lisk-transactions';
import { flags as flagParser } from '@oclif/command';
import BaseCommand from '../../base';
import { getStdIn } from '../../utils/input/utils';
import { ValidationError } from '../../utils/error';
import parseTransactionString from '../../utils/transactions';
import getInputsFromSources from '../../utils/input';
import commonFlags from '../../utils/flags';

const getTransactionInput = async () => {
	try {
		const { data } = await getStdIn({ dataIsRequired: true });
		if (!data) {
			throw new ValidationError('No transaction was provided.');
		}
		return data;
	} catch (e) {
		throw new ValidationError('No transaction was provided.');
	}
};

export default class SignCommand extends BaseCommand {
	async run() {
		const {
			args: { transaction },
			flags: {
				passphrase: passphraseSource,
				'second-passphrase': secondPassphraseSource,
			},
		} = this.parse(SignCommand);

		const transactionInput = transaction || (await getTransactionInput());
		const transactionObject = parseTransactionString(transactionInput);

		const { valid } = transactions.utils.validateTransaction(transactionObject);
		if (!valid) {
			throw new Error('Provided transaction is invalid.');
		}

		const { passphrase, secondPassphrase } = await getInputsFromSources({
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

		const result = transactions.utils.prepareTransaction(
			transactionObject,
			passphrase,
			secondPassphrase,
		);

		this.print(result);
	}
}

SignCommand.args = [
	{
		name: 'transaction',
		description: 'Transaction to sign in JSON format.',
	},
];

SignCommand.flags = {
	...BaseCommand.flags,
	passphrase: flagParser.string(commonFlags.passphrase),
	'second-passphrase': flagParser.string(commonFlags.secondPassphrase),
};

SignCommand.description = `
Sign a transaction using your secret passphrase.
`;

SignCommand.examples = [
	'transaction:sign \'{"amount":"100","recipientId":"13356260975429434553L","senderPublicKey":null,"timestamp":52871598,"type":0,"fee":"10000000","recipientPublicKey":null,"asset":{}}\'',
];
