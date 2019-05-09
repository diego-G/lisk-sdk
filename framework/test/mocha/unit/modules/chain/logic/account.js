/*
 * Copyright © 2018 Lisk Foundation
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

'use strict';

const rewire = require('rewire');
const application = require('../../../../common/application');
const modulesLoader = require('../../../../common/modules_loader');
const Bignum = require('../../../../../../src/modules/chain/helpers/bignum');

const Account = rewire('../../../../../../src/modules/chain/logic/account');

const validAccount = {
	username: 'genesis_100',
	isDelegate: 1,
	secondSignature: 0,
	address: '10881167371402274308L',
	publicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	secondPublicKey: null,
	balance: new Bignum('0'),
	multiMin: 0,
	multiLifetime: 1,
	nameExist: 0,
	fees: new Bignum('0'),
	rank: '70',
	rewards: new Bignum('0'),
	vote: 10000000000000000,
	producedBlocks: 0,
	missedBlocks: 0,
	approval: 100,
	productivity: 0,
	membersPublicKeys: null,
	votedDelegatesPublicKeys: null,
	asset: null,
};

describe('account', () => {
	let account;
	let accountLogic;
	let storage;

	before(done => {
		application.init(
			{ sandbox: { name: 'lisk_test_logic_accounts' } },
			(err, scope) => {
				if (err) {
					done(err);
				}
				account = scope.logic.account;
				storage = scope.components.storage;
				done();
			}
		);
	});

	after(done => {
		application.cleanup(done);
	});

	describe('constructor', () => {
		let library;
		let storageStub;

		before(done => {
			storageStub = {
				entities: {
					Account: {
						get: sinonSandbox.stub().resolves(),
					},
				},
			};

			new Account(
				storageStub,
				modulesLoader.scope.schema,
				modulesLoader.scope.components.logger,
				(err, lgAccount) => {
					accountLogic = lgAccount;
					library = Account.__get__('library');
					done();
				}
			);
		});

		it('should attach schema to scope variable', async () =>
			expect(accountLogic.scope.schema).to.eql(modulesLoader.scope.schema));

		it('should attach storage to scope variable', async () =>
			expect(accountLogic.scope.storage).to.eql(storageStub));

		it('should attach logger to library variable', async () =>
			expect(library.logger).to.eql(modulesLoader.scope.components.logger));
	});

	describe('verifyPublicKey', () => {
		it('should be okay for empty params', async () =>
			expect(account.verifyPublicKey()).to.be.undefined);

		it('should throw error if parameter is not a string', async () =>
			expect(() => {
				account.verifyPublicKey(1);
			}).to.throw('Invalid public key, must be a string'));

		it('should throw error if parameter is of invalid length', async () =>
			expect(() => {
				account.verifyPublicKey('231312312321');
			}).to.throw('Invalid public key, must be 64 characters long'));

		it('should throw error if parameter is not a hex string', async () =>
			expect(() => {
				account.verifyPublicKey(
					'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2az'
				);
			}).to.throw('Invalid public key, must be a hex string'));

		it('should be okay if parameter is in correct format', async () =>
			expect(() => {
				account.verifyPublicKey(
					'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a2'
				);
			}).to.not.throw());
	});

	describe('calculateApproval', () => {
		it('when voterBalance = 0 and totalSupply = 0, it should return 0', async () =>
			expect(account.calculateApproval(0, 0)).to.equal(0));

		it('when voterBalance = totalSupply, it should return 100', async () => {
			const totalSupply = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
			const votersBalance = totalSupply;
			return expect(
				account.calculateApproval(votersBalance, totalSupply)
			).to.equal(100);
		});

		it('when voterBalance = 50 and total supply = 100, it should return 50', async () =>
			expect(account.calculateApproval(50, 100)).to.equal(50));

		it('with random values, it should return approval between 0 and 100', async () => {
			// So total supply is never 0
			const totalSupply = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
			const votersBalance = Math.floor(Math.random() * totalSupply);
			return expect(account.calculateApproval(votersBalance, totalSupply))
				.to.be.least(0)
				.and.be.at.most(100);
		});
	});

	describe('merge', () => {
		before(async () =>
			storage.entities.Account.upsert(
				{ address: validAccount.address },
				{ u_username: 'test_set', vote: 1, address: validAccount.address }
			)
		);

		it('should merge diff when values are correct', done => {
			account.merge(
				validAccount.address,
				{ membersPublicKeys: ['MS1'], votedDelegatesPublicKeys: ['DLG1'] },
				(err, res) => {
					expect(err).to.not.exist;
					expect(res.votedDelegatesPublicKeys).to.deep.equal(['DLG1']);
					expect(res.membersPublicKeys).to.deep.equal(['MS1']);
					done();
				}
			);
		});

		it('should throw error when a numeric field receives non numeric value', done => {
			account.merge(validAccount.address, { balance: 'Not a Number' }, err => {
				expect(err).to.equal('Encountered insane number: NaN');
				done();
			});
		});

		describe('verify public key', () => {
			it('should throw error if parameter is not a string', async () =>
				expect(() => {
					account.merge(validAccount.address, { publicKey: 1 });
				}).to.throw('Invalid public key, must be a string'));

			it('should throw error if parameter is of invalid length', async () =>
				expect(() => {
					account.merge(validAccount.address, { publicKey: '231312312321' });
				}).to.throw('Invalid public key, must be 64 characters long'));

			it('should throw error if parameter is not a hex string', async () =>
				expect(() => {
					account.merge(validAccount.address, {
						publicKey:
							'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2az',
					});
				}).to.throw('Invalid public key, must be a hex string'));
		});

		describe('check database constraints', () => {
			it('should throw error when address does not exist for delegates', done => {
				account.merge(
					'1L',
					{ votedDelegatesPublicKeys: [validAccount.publicKey] },
					err => {
						expect(err).to.equal('Account#merge error');
						done();
					}
				);
			});

			it('should throw error when address does not exist for multisignatures', done => {
				account.merge(
					'1L',
					{ membersPublicKeys: [validAccount.publicKey] },
					err => {
						expect(err).to.equal('Account#merge error');
						done();
					}
				);
			});
		});
	});
});
