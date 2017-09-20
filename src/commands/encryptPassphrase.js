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
import cryptoModule from '../utils/cryptoModule';
import commonOptions from '../utils/options';
import { printResult } from '../utils/print';
import {
	getStdIn,
	getPassphrase,
} from '../utils/input';

const PASSWORD_DISPLAY_NAME = 'your password';

const description = `Encrypt your secret passphrase under a password.

	Example: encrypt passphrase
`;

const handleError = ({ message }) => ({ error: `Could not encrypt passphrase: ${message}` });

const handleInput = ([passphrase, password]) =>
	cryptoModule.encryptPassphrase(passphrase, password);

const getPasswordFromStdIn = ({ data }) => (
	data
		? {
			passphrase: data.split(/[\r\n]+/)[0],
		}
		: {}
);

const encryptPassphrase = vorpal => ({ options }) => {
	const passphraseSource = options.passphrase;
	const passwordSource = options.password;

	return getStdIn({
		passphraseIsRequired: passphraseSource === 'stdin',
		dataIsRequired: passwordSource === 'stdin',
	})
		.then(stdIn => getPassphrase(vorpal, passphraseSource, stdIn)
			.then(passphrase => getPassphrase(
				vorpal,
				passwordSource,
				getPasswordFromStdIn(stdIn),
				PASSWORD_DISPLAY_NAME,
			)
				.then(password => [passphrase, password]),
			),
		)
		.then(handleInput)
		.catch(handleError)
		.then(printResult(vorpal, options));
};

function encryptPassphraseCommand(vorpal) {
	vorpal
		.command('encrypt passphrase')
		.option(...commonOptions.passphrase)
		.option(...commonOptions.password)
		.option(...commonOptions.json)
		.option(...commonOptions.noJson)
		.description(description)
		.action(encryptPassphrase(vorpal));
}

export default encryptPassphraseCommand;
