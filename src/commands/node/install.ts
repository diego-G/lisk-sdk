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

import { flags as flagParser } from '@oclif/command';
import os from 'os';
import BaseCommand from '../../base';
import { NETWORK } from '../../utils/constants';
import { download, extract, verifyChecksum } from '../../utils/download';
import { getReleaseInfo } from '../../utils/node/release';
import {
	checkNotARootUser,
	createDirectory,
	directoryExists,
	isValidURL,
	LISK_DB_SNAPSHOT,
	LISK_INSTALL,
	LISK_LATEST_URL,
	LISK_SNAPSHOT_URL,
	LISK_TAR,
	LISK_TAR_SHA256,
	networkSupported,
	osSupported,
} from '../../utils/node/utils';

interface Flags {
	readonly installationPath: string;
	readonly name: string;
	readonly network: NETWORK;
	readonly 'no-snapshot': boolean;
	readonly releaseUrl: string;
	readonly snapshotUrl: string;
}

interface Options {
	readonly installDir: string;
	readonly liskTarSHA256Url: string;
	readonly liskTarUrl: string;
	readonly version: string;
}

const prereqCheck = (installPath: string): void => {
	if (!osSupported()) {
		throw new Error(`Lisk install is not supported on ${os.type()}`);
	}
	if (directoryExists(installPath)) {
		throw new Error(`Installation already exists in path ${installPath}`);
	}
};

const parseOptions = ({ network, releaseUrl, snapshotUrl }: Flags): void => {
	networkSupported(network);
	isValidURL(releaseUrl);
	isValidURL(snapshotUrl);
};

const buildOptions = async ({
	installationPath,
	name,
	network,
	releaseUrl,
}: Flags): Promise<Options> => {
	const installPath = LISK_INSTALL(installationPath);
	const installDir = `${installPath}/${name}/`;
	const latestURL = LISK_LATEST_URL(releaseUrl, network);
	const { version, liskTarUrl, liskTarSHA256Url } = await getReleaseInfo(
		latestURL,
		releaseUrl,
		network,
	);

	return {
		installDir,
		version,
		liskTarUrl,
		liskTarSHA256Url,
	};
};

const installLisk = async (options: Flags, cacheDir: string): Promise<void> => {
	try {
		const {
			installDir,
			liskTarUrl,
			liskTarSHA256Url,
			version,
		} = await buildOptions(options);
		const { name, network, snapshotUrl, 'no-snapshot': noSnapshot } = options;
		const LISK_RELEASE_PATH = `${cacheDir}/${LISK_TAR(version)}`;
		const LISK_RELEASE_SHA256_PATH = `${cacheDir}/${LISK_TAR_SHA256(version)}`;

		prereqCheck(installDir);

		await download(liskTarUrl, LISK_RELEASE_PATH);
		await download(liskTarSHA256Url, LISK_RELEASE_SHA256_PATH);
		await verifyChecksum(cacheDir, LISK_TAR_SHA256(version));

		if (!noSnapshot) {
			const snapshotPath = `${cacheDir}/${LISK_DB_SNAPSHOT(name, network)}`;
			const snapshotURL = LISK_SNAPSHOT_URL(snapshotUrl, network);
			await download(snapshotURL, snapshotPath);
		}

		createDirectory(installDir);
		await extract(cacheDir, LISK_TAR(version), installDir);
	} catch (error) {
		throw new Error(`Lisk installation failed with error: ${error}`);
	}
};

export default class InstallCommand extends BaseCommand {
	static description = `Install lisk software`;

	static examples = [
		'node:install',
		'node:install --installation-path=/opt/lisk/lisk-testnet --network=testnet',
		'node:install --snapshot-url=no',
	];

	static flags = {
		...BaseCommand.flags,
		network: flagParser.string({
			char: 'n',
			description: 'Name of the network to install(mainnet, testnet, betanet).',
			default: 'mainnet',
		}),
		installationPath: flagParser.string({
			char: 'p',
			description: 'Path of lisk software installation.',
			default: '~/.lisk/network',
		}),
		name: flagParser.string({
			description: 'Name of the directory.',
			default: 'main',
		}),
		releaseUrl: flagParser.string({
			char: 'r',
			description: 'URL to lisk release software.',
			default: 'https://downloads.lisk.io/lisk',
		}),
		snapshotUrl: flagParser.string({
			char: 's',
			description: 'URL to lisk blockchain snapshot.',
			default: 'http://snapshots.lisk.io.s3-eu-west-1.amazonaws.com/lisk',
		}),
		'no-snapshot': flagParser.boolean({
			description: 'Start lisk with blockchin snapshot',
			default: false,
		}),
	};

	async run(): Promise<void> {
		const { flags } = this.parse(InstallCommand);
		const options = flags as Flags;
		const cacheDir = this.config.cacheDir;

		checkNotARootUser();
		parseOptions(options);
		await installLisk(options, cacheDir);
		this.print({ status: `Installed lisk network: ${options.network}` });
	}
}
