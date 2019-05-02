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
import Listr from 'listr';
import BaseCommand from '../../../base';
import { isCacheRunning, stopCache } from '../../../utils/core/cache';
import { isCacheEnabled } from '../../../utils/core/config';
import { describeApplication } from '../../../utils/core/pm2';

interface Args {
	readonly name: string;
}

export default class CacheCommand extends BaseCommand {
	static args = [
		{
			name: 'name',
			description: 'Lisk Core installation directory name.',
			required: true,
		},
	];

	static description = 'Stop the cache server.';

	static examples = ['node:stop:cache mainnet-latest'];

	async run(): Promise<void> {
		const { args } = this.parse(CacheCommand);
		const { name } = args as Args;
		const { installationPath, network } = await describeApplication(name);

		const tasks = new Listr([
			{
				title: 'Stop the cache server',
				skip: () => !isCacheEnabled(installationPath, network),
				task: async () => {
					const isRunning = await isCacheRunning(installationPath, name);
					if (isRunning) {
						await stopCache(installationPath, network, name);
					}
				},
			},
		]);

		await tasks.run();
	}
}
