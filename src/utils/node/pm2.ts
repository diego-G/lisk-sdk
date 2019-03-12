import * as path from 'path';
import {
	connect,
	delete as del,
	describe,
	disconnect,
	list,
	ProcessDescription,
	restart,
	start,
	stop,
} from 'pm2';

export interface Pm2Env {
	readonly pm_cwd: string;
}

const connectPM2 = async (): Promise<void> =>
	new Promise<void>((resolve, reject) => {
		connect(err => {
			if (err) {
				reject(err);

				return;
			}
			resolve();
		});
	});

const startPM2 = async (
	installPath: string,
	network: string,
	name: string,
): Promise<void> =>
	new Promise<void>((resolve, reject) => {
		start(
			{
				name,
				script: 'app.js',
				cwd: installPath,
				env: {
					LISK_NETWORK: network,
				},
				pid: path.join(installPath, '/pids/lisk.app.pid'),
				output: path.join(installPath, '/logs/lisk.app.log'),
				error: path.join(installPath, '/logs/lisk.app.err'),
				log_date_format: 'YYYY-MM-DD HH:mm:ss SSS',
				watch: false,
				kill_timeout: 10000,
				max_memory_restart: '1024M',
				min_uptime: 20000,
				max_restarts: 10,
			},
			err => {
				if (err) {
					reject(err);

					return;
				}
				resolve();

				return;
			},
		);
	});

const restartPM2 = async (process: string | number): Promise<void> =>
	new Promise<void>((resolve, reject) => {
		restart(process, err => {
			if (err && err.message !== 'process name not found') {
				reject();

				return;
			}
			resolve();
		});
	});

const stopPM2 = async (process: string | number): Promise<void> =>
	new Promise<void>((resolve, reject) => {
		stop(process, err => {
			if (err && err.message !== 'process name not found') {
				reject();

				return;
			}
			resolve();
		});
	});

const describePM2 = async (
	process: string | number,
): Promise<ProcessDescription> =>
	new Promise<ProcessDescription>((resolve, reject) => {
		describe(process, (err, descs) => {
			if (err && err.message !== 'process name not found') {
				reject(err);

				return;
			}
			const pDesc = descs.find(
				desc => desc.pid === process || desc.name === process,
			);
			if (!pDesc) {
				reject(new Error(`Process ${process} not found`));
			}
			resolve(pDesc);
		});
	});

const listPM2 = async (): Promise<ReadonlyArray<ProcessDescription>> =>
	new Promise<ReadonlyArray<ProcessDescription>>((resolve, reject) => {
		list((err, res) => {
			if (err) {
				reject(err);

				return;
			}
			resolve(res);
		});
	});

const deleteProcess = async (process: string | number): Promise<void> =>
	new Promise<void>((resolve, reject) => {
		del(process, err => {
			if (err) {
				reject(err);

				return;
			}
			resolve();

			return;
		});
	});

export const registerApplication = async (
	installPath: string,
	network: string,
	name: string,
): Promise<void> => {
	await connectPM2();
	await startPM2(installPath, network, name);
	await stopPM2(name);
	disconnect();
};

export const unRegisterApplication = async (name: string): Promise<void> => {
	await connectPM2();
	await deleteProcess(name);
	disconnect();
};

export const restartApplication = async (name: string): Promise<void> => {
	await connectPM2();
	await restartPM2(name);
	disconnect();
};

export const stopApplication = async (name: string): Promise<void> => {
	await connectPM2();
	await stopPM2(name);
	disconnect();
};

export const listApplication = async (): Promise<
	ReadonlyArray<ProcessDescription>
> => {
	await connectPM2();
	const applications = await listPM2();
	disconnect();

	return applications;
};

export const describeApplication = async (
	name: string,
): Promise<ProcessDescription> => {
	await connectPM2();
	const application = await describePM2(name);
	disconnect();

	return application;
};
