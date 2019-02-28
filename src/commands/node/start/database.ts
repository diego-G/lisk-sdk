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
import * as Listr from 'listr';
import BaseCommand from '../../../base';
import { NETWORK } from '../../../utils/constants';
import { installDirectory } from '../../../utils/node/commons';
import {
	createDatabase,
	createUser,
	initDB,
	startDatabase,
} from '../../../utils/node/database';
import InstallCommand from '../install';

export interface Flags {
	readonly installationPath: string;
	readonly name: string;
	readonly network: NETWORK;
	readonly 'no-snapshot': boolean;
}

export default class DatabaseCommand extends BaseCommand {
	static description = 'Start Lisk Core Database';

	static examples = [
		'node:start:database',
		'node:start:database --no-snapshot',
		'node:start:database --network=testnet',
		'node:start:database --installation-path=/opt/lisk/lisk-testnet --network=testnet',
	];

	static flags = {
		...BaseCommand.flags,
		network: InstallCommand.flags.network,
		installationPath: InstallCommand.flags.installationPath,
		name: InstallCommand.flags.name,
		'no-snapshot': InstallCommand.flags['no-snapshot'],
	};

	async run(): Promise<void> {
		const { flags } = this.parse(DatabaseCommand);
		const { network, installationPath, name } = flags as Flags;
		const installDir = installDirectory(installationPath, name);

		const tasks = new Listr.default([
			{
				title: 'Start Lisk Core Database',
				task: () =>
					new Listr.default([
						{
							title: 'Init Postgres',
							task: async () => {
								await initDB(installDir);
							},
						},
						{
							title: 'Start Postgres Server',
							task: async () => {
								await startDatabase(installDir);
							},
						},
						{
							title: 'Create user and database',
							task: async () => {
								await createUser(installDir, network);
								await createDatabase(installDir, network);
							},
						},
					]),
			},
		]);

		await tasks.run();
	}
}
