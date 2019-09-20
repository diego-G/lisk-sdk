/* eslint-disable no-console */
const pgpLib = require('pg-promise');
const childProcess = require('child_process');
const { createStorageComponent } = require('./storage');

this.pgpOptions = {
	capSQL: true,
	promiseLib: Promise,
	noLocking: false,
	noWarnings: true,
};
const pgp = pgpLib(this.pgpOptions);

class PgHelper {
	constructor({ dbName = 'lisk_dev' }) {
		this.dbName = dbName;
		this.cnStr = `postgres://localhost:5432/${dbName}`;
		if (dbName.indexOf('postgres://') === 0) {
			this.cnStr = dbName;
		}

		this.pgp = pgp(this.cnStr);
		this.storage = null;
	}

	_dropDB() {
		return new Promise(resolve => {
			console.log('Dropping database instance:', this.dbName);
			childProcess.exec(`dropdb ${this.dbName}`, () => resolve());
		});
	}

	_createDB() {
		return new Promise((resolve, reject) => {
			console.log('Creating database instance:', this.dbName);
			childProcess.exec(`createdb ${this.dbName}`, error => {
				if (error) {
					return reject(error);
				}
				return resolve();
			});
		});
	}

	async bootstrap() {
		await this._dropDB();
		await this._createDB();
		return this.pgp.connect();
	}

	async cleanup() {
		await this.storage.adapter.db.$pool.end();
		await this.pgp.$pool.end();
	}

	async createStorage(options = {}, logger) {
		const storageOptions = {
			database: this.dbName,
			min: 1,
			max: 10,
			logFileName: `logs/devnet/lisk_${this.dbName}.log`,
			noWarnings: true,
			...options,
		};
		this.storage = await createStorageComponent(storageOptions, logger);

		return this.storage;
	}

	static async createAccount(db, account) {
		const keyValueSet = Object.keys(account).map(field => {
			return {
				field: `"${field}"`,
				value:
					field === 'publicKey'
						? `DECODE(\${a.${field}}, 'hex')`
						: `\${a.${field}}`,
			};
		});

		await db.query(
			'DELETE FROM mem_accounts WHERE "publicKey" = DECODE($1, \'hex\')',
			account.publicKey,
		);

		await db.query(
			`INSERT INTO mem_accounts (${keyValueSet
				.map(k => k.field)
				.join(',')}) VALUES (${keyValueSet.map(k => k.value).join(',')})`,
			{ a: account },
		);
	}

	static async getAccountByPublicKey(db, publicKey) {
		return db.one(
			`SELECT
			"address",
			ENCODE("publicKey", 'hex') as "publicKey",
			ENCODE("secondPublicKey", 'hex') as "secondPublicKey",
			"username",
			"isDelegate"::int::boolean,
			"secondSignature"::int::boolean,
			"balance",
			"asset",
			"multimin" as "multiMin",
			"multilifetime" as "multiLifetime",
			"nameexist"::int::boolean as "nameExist",
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
