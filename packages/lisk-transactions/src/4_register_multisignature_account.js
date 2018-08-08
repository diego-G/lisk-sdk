/*
 * Copyright © 2018 Lisk Foundation
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
import {
	MULTISIGNATURE_FEE,
	MULTISIGNATURE_MAX_LIFETIME,
	MULTISIGNATURE_MIN_LIFETIME,
	MULTISIGNATURE_MAX_SIGNATURES,
	MULTISIGNATURE_MIN_SIGNATURES,
} from './constants';
import {
	prependPlusToPublicKeys,
	validateKeysgroup,
	wrapTransactionCreator,
	isValidInteger,
} from './utils';

const validateInputs = ({ keysgroup, lifetime, minimum }) => {
	validateKeysgroup(keysgroup);

	if (
		!isValidInteger(lifetime) ||
		lifetime < MULTISIGNATURE_MIN_LIFETIME ||
		lifetime > MULTISIGNATURE_MAX_LIFETIME
	) {
		throw new Error(
			`Please provide a valid lifetime value. Expected integer between ${MULTISIGNATURE_MIN_LIFETIME} and ${MULTISIGNATURE_MAX_LIFETIME}.`,
		);
	}

	if (
		!isValidInteger(minimum) ||
		minimum < MULTISIGNATURE_MIN_SIGNATURES ||
		minimum > MULTISIGNATURE_MAX_SIGNATURES
	) {
		throw new Error(
			`Please provide a valid minimum value. Expected integer between ${MULTISIGNATURE_MIN_SIGNATURES} and ${MULTISIGNATURE_MAX_SIGNATURES}.`,
		);
	}
};

const registerMultisignatureAccount = inputs => {
	validateInputs(inputs);
	const { keysgroup, lifetime, minimum } = inputs;
	const plusPrependedKeysgroup = prependPlusToPublicKeys(keysgroup);
	const keygroupFees = plusPrependedKeysgroup.length + 1;

	return {
		type: 4,
		fee: (MULTISIGNATURE_FEE * keygroupFees).toString(),
		asset: {
			multisignature: {
				min: minimum,
				lifetime,
				keysgroup: plusPrependedKeysgroup,
			},
		},
	};
};

export default wrapTransactionCreator(registerMultisignatureAccount);
