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
import { ValidationError } from '../utils/error';
import commonOptions from '../utils/options';
import { printResult } from '../utils/print';

export const validatePublicKeys = publicKeys => publicKeys.map((publicKey) => {
	try {
		Buffer.from(publicKey, 'hex').toString('hex');
	} catch (error) {
		throw new Error(`Error processing public key ${publicKey}: ${error.message}.`);
	}
	if (publicKey.length !== 64) {
		throw new Error(`Public key ${publicKey} length differs from the expected 64 hex characters for a public key.`);
	}
	return publicKey;
});

export const prependPlusToPublicKeys = publicKeys => publicKeys.map(publicKey => `+${publicKey}`);

export const prependMinusToPublicKeys = publicKeys => publicKeys.map(publicKey => `-${publicKey}`);

const regExpAddress = /^\d{1,21}[L|l]$/;
const regExpAmount = /^\d+(\.\d{1,8})?$/;

const isStringInteger = (n) => {
	const parsed = parseInt(n, 10);
	return !Number.isNaN(parsed) && parsed.toString() === n;
};

export const validateLifetime = (lifetime) => {
	if (!isStringInteger(lifetime)) {
		throw new ValidationError('Lifetime must be an integer.');
	}
	return true;
};

export const validateMinimum = (minimum) => {
	if (!isStringInteger(minimum)) {
		throw new ValidationError('Minimum number of signatures must be an integer.');
	}
	return true;
};

export const validateAddress = (address) => {
	if (!address.match(regExpAddress)) {
		throw new ValidationError(`${address} is not a valid address.`);
	}
	return true;
};

export const validateAmount = (amount) => {
	if (!amount.match(regExpAmount)) {
		throw new ValidationError('Amount must be a number with no more than 8 decimal places.');
	}
	return true;
};

export const deAlias = type => (
	type === 'address'
		? 'account'
		: type
);

export const processQueryResult = type => result => (
	result.error
		? result
		: result[deAlias(type)]
);

export const shouldUseJsonOutput = (config, options) =>
	(options.json === true || config.json === true)
		&& options.json !== false;

export const shouldUsePrettyOutput = (config, options) =>
	(options.pretty === true || config.pretty === true)
		&& options.pretty !== false;

export const createErrorHandler = prefix => ({ message }) => ({
	error: `${prefix}: ${message}`,
});

export const wrapActionCreator = (vorpal, actionCreator, errorPrefix) => parameters =>
	actionCreator(vorpal)(parameters)
		.catch(createErrorHandler(errorPrefix))
		.then(printResult(vorpal, parameters.options));

export const createCommand = ({
	command,
	autocomplete,
	description,
	alias,
	actionCreator,
	options = [],
	errorPrefix,
}) => function createdCommand(vorpal) {
	const action = wrapActionCreator(vorpal, actionCreator, errorPrefix);
	const commandInstance = vorpal
		.command(command)
		.autocomplete(autocomplete)
		.description(description)
		.action(action);

	if (alias) commandInstance.alias(alias);

	[
		commonOptions.json,
		commonOptions.noJson,
		commonOptions.pretty,
		...options,
	].forEach(option => commandInstance.option(...option));
};
