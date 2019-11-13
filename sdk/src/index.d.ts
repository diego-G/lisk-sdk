/*
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
 */

/* tslint:disable */
import * as BigNum from '@liskhq/bignum';
import * as cryptography from '@liskhq/lisk-cryptography';
import * as transactions from '@liskhq/lisk-transactions';

declare class Application {
	constructor(genesisBlock: object, config: object);
	run(): Promise<void>;
	registerTransaction(transactionClass: object): void;
}

declare const version: number;
declare const systemDirs: any;
declare const configurator: any;

declare const configDevnet: any;
declare const genesisBlockDevnet: any;

export {
	Application,
	version,
	systemDirs,
	configurator,
	BigNum,
	cryptography,
	transactions,
	configDevnet,
	genesisBlockDevnet,
};
