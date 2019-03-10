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
import Listr from 'listr';
import BaseCommand from '../../../base';
import { NETWORK } from '../../../utils/constants';
import { flags as commonFlags } from '../../../utils/flags';
import { isCacheRunning, startCache } from '../../../utils/node/cache';
import { installDirectory } from '../../../utils/node/commons';
import { isCacheEnabled } from '../../../utils/node/config';

export interface Flags {
	readonly installationPath: string;
	readonly name: string;
	readonly network: NETWORK;
}

export default class CacheCommand extends BaseCommand {
	static description = 'Start Lisk Core Cache';

	static examples = [
		'node:start:cache',
		'node:start:cache --network=testnet',
		'node:start:cache --installation-path=/opt/lisk/lisk-testnet --network=testnet',
	];

	static flags = {
		...BaseCommand.flags,
		network: flagParser.string({
			...commonFlags.network,
			options: [NETWORK.MAINNET, NETWORK.TESTNET, NETWORK.BETANET],
		}),
		installationPath: flagParser.string({
			...commonFlags.installationPath,
		}),
		name: flagParser.string({
			...commonFlags.name,
		}),
	};

	async run(): Promise<void> {
		const { flags } = this.parse(CacheCommand);
		const { network, installationPath, name } = flags as Flags;
		const installDir = installDirectory(installationPath, name);

		const tasks = new Listr([
			{
				title: 'Start Lisk Core Cache',
				skip: () => !isCacheEnabled(installDir, network),
				task: async () => {
					const isRunning = await isCacheRunning(installDir, network);
					if (!isRunning) {
						await startCache(installDir);
					}
				},
			},
		]);

		await tasks.run();
	}
}
