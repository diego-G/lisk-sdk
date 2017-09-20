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
import { printResult } from '../utils/print';
import {
	getStdIn,
	getPassphrase,
} from '../utils/input';

const handleError = ({ message }) => ({ error: `Could not encrypt passphrase: ${message}` });

const handleInput = ([passphrase, password]) =>
	cryptoModule.encryptPassphrase(passphrase, password);

const encryptPassphrase = vorpal => ({ options }) => {
	const passphraseSource = options.passphrase;
	const passwordSource = options.password;

	return getStdIn({
		passphraseIsRequired: passphraseSource === 'stdin',
		dataIsRequired: passwordSource === 'stdin',
	})
		.then(() => getPassphrase(vorpal, passphraseSource, {})
			.then(passphrase => getPassphrase(vorpal, passwordSource, {})
				.then(password => [passphrase, password]),
			),
		)
		.then(handleInput)
		.catch(handleError)
		.then(printResult(vorpal, {}));
};

function encryptPassphraseCommand(vorpal) {
	vorpal
		.command('encryptPassphrase')
		.action(encryptPassphrase(vorpal));
}

export default encryptPassphraseCommand;
