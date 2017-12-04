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
import chalk from 'chalk';
import config from './config';
import { shouldUseJsonOutput, shouldUsePrettyOutput } from './helpers';
import tablify from './tablify';

export const printResult = (vorpal, options = {}) => (result) => {
	const useJsonOutput = shouldUseJsonOutput(config, options);
	const prettifyOutput = shouldUsePrettyOutput(config, options);

	const output = useJsonOutput
		? JSON.stringify(result, null, prettifyOutput ? '\t' : null)
		: tablify(result).toString();

	vorpal.activeCommand.log(output);
	return result;
};

// TODO: Include commented placeholders when we support Node 8
const PLACEHOLDERS = [
	'%s',
	'%d',
	// '%i',
	// '%f',
	'%j',
	// '%o',
	// '%O',
];

const wrapLogFunction = (fn, colour) => (...args) => {
	const colourArg = arg => chalk[colour](arg);
	const isPlaceholderPresent = placeholder => args[0].includes(placeholder);
	return (PLACEHOLDERS.some(isPlaceholderPresent)
		? fn(colourArg(args[0]), ...args.slice(1))
		: fn(...args.map(colourArg)));
};

export const logWarning = wrapLogFunction(console.warn, 'yellow');
export const logError = wrapLogFunction(console.error, 'red');
