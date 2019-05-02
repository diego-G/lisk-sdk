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
import BaseCommand from '../../base';
import { describeApplication, listApplication } from '../../utils/core/pm2';

interface Args {
	readonly name: string;
}

export default class StatusCommand extends BaseCommand {
	static args = [
		{
			name: 'name',
			description: 'Lisk Core installation directory name.',
			required: false,
		},
	];

	static description = 'Show the status of a Lisk Core instances.';

	static examples = ['node:status', 'node:status mainnet-latest'];

	async run(): Promise<void> {
		const { args } = this.parse(StatusCommand);
		const { name } = args as Args;

		if (name) {
			const instance = await describeApplication(name);

			this.print(instance);
		} else {
			const instances = await listApplication();

			if (!instances.length) {
				this.log(
					'Lisk Core instances not available, use lisk node:install --help',
				);
			} else {
				const toDisplay = [
					'name',
					'status',
					'network',
					'version',
					'started_at',
					'cpu',
					'memory',
				];
				const filtered = instances.map(instance =>
					Object.keys(instance).reduce(
						(newObj, key) =>
							toDisplay.includes(key)
								? {
										...newObj,
										[key]: ((instance as unknown) as {
											readonly [key: string]: string;
										})[key],
								  }
								: newObj,
						{},
					),
				);
				this.print(filtered);
			}
		}
	}
}
