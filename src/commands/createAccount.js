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
import { createCommand } from '../utils/helpers';
import { createMnemonicPassphrase } from '../utils/mnemonic';

const description = `Returns a randomly-generated mnemonic passphrase with its corresponding public key and address.

	Example: create account
`;

export const actionCreator = () => async () => {
	const passphrase = createMnemonicPassphrase();
	const { publicKey } = cryptoModule.getKeys(passphrase);
	const { address } = cryptoModule.getAddressFromPublicKey(publicKey);

	return {
		passphrase,
		publicKey,
		address,
	};
};

const createAccount = createCommand({
	command: 'create account',
	description,
	actionCreator,
	errorPrefix: 'Could not create account',
});

export default createAccount;
