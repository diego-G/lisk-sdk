const {
	RoundDelegates,
} = require('../../../../../../../../../../src/modules/chain/components/storage/entities');
const { PgHelper } = require('../../../../../../../utils/pg-helper');

describe('storage.entities.RoundDelegates.create', () => {
	let pgHelper;
	let storage;
	let db;

	beforeAll(async () => {
		// Arrange
		pgHelper = new PgHelper({ dbName: 'RoundDelegatesCreate' });

		// Create second postgres connection
		db = await pgHelper.bootstrap();

		// Setup storage for Accounts
		storage = await pgHelper.createStorage();
		storage.registerEntity('RoundDelegates', RoundDelegates);
	});

	afterAll(async () => {
		await db.done();
		await pgHelper.cleanup();
	});

	describe('Given arguments = ({round, delegatePublicKeys})', () => {
		it('should delete delegate list after round', async () => {
			// Arrange
			const delegatePublicKeys = ['pk1', 'pk2', 'pk3'];
			const round = 6;

			// Act
			await storage.entities.RoundDelegates.create({
				round,
				delegatePublicKeys,
			});

			// Assert
			const result = await db.one(
				'SELECT "delegatePublicKeys" FROM round_delegates WHERE round = $1 ',
				round,
			);
			expect(result).toEqual({ delegatePublicKeys });
		});
	});
});
