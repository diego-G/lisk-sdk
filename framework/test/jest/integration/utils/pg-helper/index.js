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

const pgpLib = require('pg-promise');
const childProcess = require('child_process');
const { createStorageComponent } = require('./storage');

this.pgpOptions = {
	capSQL: true,
	promiseLib: Promise,
	noLocking: false,
};
const pgp = pgpLib(this.pgpOptions);

class PgHelper {
	constructor(options) {
		const defaultOptions = {
			host: 'localhost',
			port: 5432,
			user: 'lisk',
			password: 'password',
			min: 1,
			max: 2,
		};

		if (!options.database) {
			throw new Error('Please define a database name');
		}

		// eslint-disable-next-line no-param-reassign
		options = { ...defaultOptions, ...options };

		this.database = options.database;

		this.pgp = pgp(options);
		this.storage = null;
	}

	_dropDB() {
		return new Promise(resolve => {
			childProcess.exec(`dropdb ${this.database}`, err => {
				if (err) {
					// eslint-disable-next-line no-console
					console.log(`dropdb ${this.database} failed`, err.message);
				}
				resolve();
			});
		});
	}

	_createDB() {
		return new Promise((resolve, reject) => {
			childProcess.exec(`createdb ${this.database}`, err => {
				if (err) {
					// eslint-disable-next-line no-console
					console.log(`createdb ${this.database} failed`, err.message);
					return reject(err);
				}
				return resolve();
			});
		});
	}

	async bootstrap() {
		await this._dropDB();
		await this._createDB();
		this.conn = await this.pgp.connect();
		return this.conn;
	}

	async cleanup() {
		await this.storage.adapter.db.$pool.end();
		await this.conn.done();
		await this.pgp.$pool.end();
		await this._dropDB();
	}

	async createStorage(options = {}, logger) {
		const storageOptions = {
			database: this.database,
			user: 'lisk',
			password: 'password',
			min: 1,
			max: 1,
			logFileName: `logs/devnet/lisk_${this.database}.log`,
			noWarnings: true,
			poolIdleTimeout: 30000,
			reapIntervalMillis: 1000,
			logEvents: ['error'],
			...options,
		};
		this.storage = await createStorageComponent(storageOptions, logger);

		return this.storage;
	}

	async createAccount(account) {
		const keyValueSet = Object.keys(account).map(field => {
			return {
				field: `"${field}"`,
				value:
					field === 'publicKey'
						? `DECODE(\${a.${field}}, 'hex')`
						: `\${a.${field}}`,
			};
		});

		await this.conn.query(
			'DELETE FROM mem_accounts WHERE "publicKey" = DECODE($1, \'hex\')',
			account.publicKey,
		);

		await this.conn.query(
			`INSERT INTO mem_accounts (${keyValueSet
				.map(k => k.field)
				.join(',')}) VALUES (${keyValueSet.map(k => k.value).join(',')})`,
			{ a: account },
		);
	}

	async deleteAllAccounts() {
		return this.conn.query('DELETE FROM mem_accounts');
	}

	async getAccountByPublicKey(publicKey) {
		return this.conn.one(
			`SELECT
			"address",
			ENCODE("publicKey", 'hex') as "publicKey",
			ENCODE("secondPublicKey", 'hex') as "secondPublicKey",
			"username",
			"isDelegate",
			"secondSignature",
			"balance",
			"asset",
			"multimin" as "multiMin",
			"multilifetime" as "multiLifetime",
			"nameexist" as "nameExist",
			"missedBlocks",
			"producedBlocks",
			"rank",
			"fees",
			"rewards",
			"vote",
			"voteWeight",
			case
			when
				"producedBlocks" + "missedBlocks" = 0 then 0
			else
				ROUND((("producedBlocks"::float / ("producedBlocks" + "missedBlocks")) * 100.0)::numeric, 2)::float
			end AS productivity
			FROM mem_accounts WHERE  "publicKey" = DECODE($1, 'hex')`,
			publicKey,
		);
	}
}

module.exports = {
	PgHelper,
};
