/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
import { ValidationError } from '../../utils/error';
import { flags as commonFlags } from '../../utils/flags';
import { getInputsFromSources } from '../../utils/input';
import { getStdIn } from '../../utils/input/utils';
import {
	instantiateTransaction,
	parseTransactionString,
} from '../../utils/transactions';

interface Args {
	readonly transaction?: string;
}

const getTransactionInput = async (): Promise<string> => {
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
	static args = [
		{
			name: 'transaction',
			description: 'Transaction to sign in JSON format.',
		},
	];

	static description = `
	Sign a transaction using your secret passphrase.
	`;

	static examples = [
		'transaction:sign \'{"amount":"100","recipientId":"13356260975429434553L","senderPublicKey":null,"timestamp":52871598,"type":0,"fee":"10000000","recipientPublicKey":null,"asset":{}}\'',
	];

	static flags = {
		...BaseCommand.flags,
		passphrase: flagParser.string(commonFlags.passphrase),
		'second-passphrase': flagParser.string(commonFlags.secondPassphrase),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: {
				passphrase: passphraseSource,
				'second-passphrase': secondPassphraseSource,
			},
		} = this.parse(SignCommand);

		const { transaction }: Args = args;
		const transactionInput = transaction || (await getTransactionInput());
		const transactionObject = parseTransactionString(transactionInput);

		const { passphrase, secondPassphrase } = await getInputsFromSources({
			passphrase: {
				source: passphraseSource,
				repeatPrompt: true,
			},
			secondPassphrase: !secondPassphraseSource
				? undefined
				: {
						source: secondPassphraseSource,
						repeatPrompt: true,
				  },
		});

		if (!passphrase) {
			throw new Error('Passphrase is required to sign the transaction');
		}

		const txInstance = instantiateTransaction(transactionObject);
		txInstance.sign(passphrase, secondPassphrase);

		const { errors } = txInstance.validate();

		if (errors.length !== 0) {
			throw new Error('Provided transaction is invalid.');
		}

		const data = Object.entries(txInstance.toJSON()).reduce(
			(prev, [key, val]) => {
				if (val !== undefined) {
					return {
						...prev,
						[key]: val,
					};
				}

				return prev;
			},
			{},
		);

		this.print(data);
	}
}
