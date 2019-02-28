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
import * as fs from 'fs';

interface CacheConfig {
	readonly host: string;
	readonly password: string | null;
	readonly port: number;
}

interface DbConfig {
	readonly database: boolean;
	readonly host: boolean;
	readonly password: boolean;
	readonly port: boolean;
}

export interface NodeConfig {
	readonly cacheEnabled: boolean;
	readonly db: DbConfig;
	readonly redis: CacheConfig;
}

export const configPath = (network: string = 'default'): string =>
	`config/${network}/config.json`;

export const getConfig = (filePath: string): object => {
	if (!fs.existsSync(filePath)) {
		throw new Error(`Config file not exists in path: ${filePath}`);
	}
	const config = fs.readFileSync(filePath, 'utf8');

	return JSON.parse(config);
};

export const getAppConfig = (
	installDir: string,
	network: string,
): NodeConfig => {
	const defaultConfigPath = `${installDir}/${configPath()}`;
	const networkConfigPath = `${installDir}/${configPath(network)}`;

	const defaultConfig = getConfig(defaultConfigPath) as NodeConfig;
	const networkConfig = getConfig(networkConfigPath) as NodeConfig;

	return { ...defaultConfig, ...networkConfig };
};
