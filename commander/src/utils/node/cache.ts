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
import { NETWORK } from '../constants';
import { exec, ExecResult } from '../worker-process';
import { CacheConfig, getCacheConfig } from './config';
import { describeApplication, Pm2Env } from './pm2';

const CACHE_START_SUCCESS = '[+] Redis-Server started successfully.';
const CACHE_START_FAILURE = '[-] Failed to start Redis-Server.';
const CACHE_STOP_SUCCESS = '[+] Redis-Server stopped successfully.';
const CACHE_STOP_FAILURE = '[-] Failed to stop Redis-Server.';

const REDIS_CONFIG = 'etc/redis.conf';
const REDIS_BIN = 'bin/redis-server';
const REDIS_CLI = 'bin/redis-cli';

const getRedisPort = async (name: string): Promise<string> => {
	const { pm2_env } = await describeApplication(name);
	const { LISK_REDIS_PORT } = pm2_env as Pm2Env;

	return LISK_REDIS_PORT;
};

export const isCacheRunning = async (
	installDir: string,
	name: string,
): Promise<boolean> => {
	try {
		const LISK_REDIS_PORT = await getRedisPort(name);

		const { stdout }: ExecResult = await exec(
			`cd ${installDir}; ${REDIS_CLI} -p ${LISK_REDIS_PORT} ping`,
		);

		return stdout.search('PONG') >= 0;
	} catch (error) {
		return false;
	}
};

export const startCache = async (
	installDir: string,
	name: string,
): Promise<string> => {
	const LISK_REDIS_PORT = await getRedisPort(name);

	const { stdout, stderr }: ExecResult = await exec(
		`cd ${installDir}; ${REDIS_BIN} ${REDIS_CONFIG} --port ${LISK_REDIS_PORT}`,
	);

	if (stdout.trim() === '') {
		return CACHE_START_SUCCESS;
	}

	throw new Error(`${CACHE_START_FAILURE}: \n\n ${stderr}`);
};

const stopCommand = async (
	installDir: string,
	network: NETWORK,
	name: string,
): Promise<string> => {
	const { password }: CacheConfig = getCacheConfig(installDir, network);
	const LISK_REDIS_PORT = await getRedisPort(name);

	if (password) {
		return `${REDIS_CLI} -p ${LISK_REDIS_PORT} -a ${password} shutdown`;
	}

	return `${REDIS_CLI} -p ${LISK_REDIS_PORT} shutdown`;
};

export const stopCache = async (
	installDir: string,
	network: NETWORK,
	name: string,
): Promise<string> => {
	const cmd = await stopCommand(installDir, network, name);

	const { stdout, stderr }: ExecResult = await exec(`cd ${installDir}; ${cmd}`);

	if (stdout.trim() === '') {
		return CACHE_STOP_SUCCESS;
	}

	throw new Error(`${CACHE_STOP_FAILURE}: \n\n ${stderr}`);
};
