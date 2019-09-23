const {
	Account,
} = require('../../../../../../../../../../src/modules/chain/components/storage/entities');
const { PgHelper } = require('../../../../../../../utils/pg-helper');
const { constants } = require('../../../../../../../../common_utils');

describe('storage.entities.Account.update', () => {
	let pgHelper;
	let storage;
	let db;

	beforeAll(async () => {
		// Arrange
		pgHelper = new PgHelper({ dbName: 'AccountUpdate' });

		// Create second postgres connection
		db = await pgHelper.bootstrap();

		// Setup storage for Accounts
		storage = await pgHelper.createStorage();
		storage.registerEntity('Account', Account);

		storage.entities.Account.extendDefaultOptions({
			limit: constants.ACTIVE_DELEGATES,
		});
	});

	afterAll(async () => {
		await pgHelper.cleanup();
	});

	describe('update(filter = {publicKey: account.publicKey}, data = {rewards, fees, balance}, tx = tx)', () => {
		it('should update rewards, fees and balance fields for each given account', async () => {
			// Arrange
			const account = {
				address: 'delegateAddress',
				isDelegate: 0,
				publicKey:
					'399a7d14610c4da8800ed929fc6a05133deb8fbac8403dec93226e96fa7590ee',
				balance: 1234,
				fees: 123,
				rewards: 1235,
			};

			const expectedAccount = {
				...account,
				balance: '2234',
				fees: '423',
				rewards: '3235',
			};

			await pgHelper.createAccount(account);

			// Act
			await db.tx(async tx => {
				await storage.entities.Account.update(
					{
						publicKey: account.publicKey,
					},
					{
						balance: (account.balance + 1000).toString(),
						fees: (account.fees + 300).toString(),
						rewards: (account.rewards + 2000).toString(),
					},
					{},
					tx,
				);
			});

			// Assert
			const updatedAccount = await pgHelper.getAccountByPublicKey(
				account.publicKey,
			);
			expect(updatedAccount).toMatchObject(expectedAccount);
		});
	});
});
