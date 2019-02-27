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
import Fs from 'fs';
import os from 'os';
import { NETWORK, OS } from '../constants';

export const LISK_INSTALL = (installPath: string): string =>
	installPath.replace('~', os.homedir);

export const LISK_VERSION = (version: string): string =>
	`lisk-${version}-${os.type()}-x86_64`;

export const LISK_TAR = (version: string): string =>
	`${LISK_VERSION(version)}.tar.gz`;

export const LISK_TAR_SHA256 = (version: string): string =>
	`${LISK_TAR(version)}.SHA256`;

export const LISK_LATEST_URL = (url: string, network: NETWORK) =>
	`${url}/${network}/latest.txt`;

export const LISK_SNAPSHOT_URL = (url: string, network: NETWORK) =>
	`${url}/${network}/blockchain.db.gz`;

export const LISK_DB_SNAPSHOT = (networkName: string, network: NETWORK) =>
	`${networkName}-${network}-blockchain.db.gz`;

export const LOGS_DIR = (installPath: string) =>
	`${LISK_INSTALL(installPath)}/logs`;
export const SH_LOG_FILE = 'logs/lisk.out';

export const checkNotRootUser = (): void => {
	if (process.getuid && process.getuid() === 0) {
		throw new Error('Error: Lisk should not be run be as root. Exiting.');
	}
};

export const osSupported = (): boolean => os.type() in OS;

export const networkSupported = (network: NETWORK): void => {
	if (network.toLowerCase() in NETWORK) {
		return;
	}

	throw new Error(
		`Network "${network}" is not supported, please try options ${Object.values(
			NETWORK,
		)}`,
	);
};

export const directoryExists = (dirPath: string): boolean =>
	Fs.existsSync(dirPath);

export const createDirectory = (dirPath: string): void => {
	const resolvedPath = LISK_INSTALL(dirPath);
	if (!directoryExists(resolvedPath)) {
		Fs.mkdirSync(resolvedPath, { recursive: true });
	}
};
export const isValidURL = (url: string): void => {
	const isValid = new RegExp(/^(ftp|http|https):\/\/[^ "]+$/);

	if (isValid.test(url)) {
		return;
	}

	throw new Error(`Invalid URL: ${url}`);
};
