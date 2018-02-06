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

require('../../../functional.js');
var Promise = require('bluebird');
var lisk = require('lisk-js');
var apiHelpers = require('../../../../common/helpers/api');
var randomUtil = require('../../../../common/utils/random');
var swaggerEndpoint = require('../../../../common/swagger_spec');
var accountFixtures = require('../../../../fixtures/accounts');

var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;
var sendTransactionPromise = apiHelpers.sendTransactionPromise;

describe('GET /api/node', () => {
	describe('/transactions', () => {
		describe('/unconfirmed @unstable', () => {
			var UnconfirmedEndpoint = new swaggerEndpoint(
				'GET /node/transactions/{state}'
			).addParameters({ state: 'unconfirmed' });

			var account = randomUtil.account();
			var transactionList = [];
			var numOfTransactions = 5;

			before(() => {
				var data = 'extra information';

				// Create numOfTransactions transactions
				for (var i = 0; i < numOfTransactions; i++) {
					transactionList.push(
						lisk.transaction.createTransaction(
							account.address,
							Math.random() * 1000,
							accountFixtures.genesis.password,
							null,
							data
						)
					);
				}

				// TODO: Fix transaction posting logic, so multiple transactions posted by API should not bundled
				return Promise.map(transactionList, function(transaction) {
					return sendTransactionPromise(transaction);
				}).then(function(responses) {
					responses.map(function(res) {
						expect(res.body.data.message).to.be.equal(
							'Transaction(s) accepted'
						);
					});
				});
			});

			describe('with wrong input', () => {
				it('using invalid field name should fail', () => {
					return UnconfirmedEndpoint.makeRequest(
						{
							whatever: accountFixtures.genesis.address,
						},
						400
					).then(res => {
						expectSwaggerParamError(res, 'whatever');
					});
				});

				it('using empty parameter should fail', () => {
					return UnconfirmedEndpoint.makeRequest(
						{
							recipientPublicKey: '',
						},
						400
					).then(res => {
						expectSwaggerParamError(res, 'recipientPublicKey');
					});
				});

				it('using completely invalid fields should fail', () => {
					return UnconfirmedEndpoint.makeRequest(
						{
							senderId: 'invalid',
							recipientId: 'invalid',
							limit: 'invalid',
							offset: 'invalid',
							sort: 'invalid',
						},
						400
					).then(res => {
						expectSwaggerParamError(res, 'senderId');
						expectSwaggerParamError(res, 'recipientId');
						expectSwaggerParamError(res, 'limit');
						expectSwaggerParamError(res, 'offset');
						expectSwaggerParamError(res, 'sort');
					});
				});

				it('using partially invalid fields should fail', () => {
					return UnconfirmedEndpoint.makeRequest(
						{
							senderId: 'invalid',
							recipientId: account.address,
							limit: 'invalid',
							offset: 'invalid',
							sort: 'invalid',
						},
						400
					).then(res => {
						expectSwaggerParamError(res, 'senderId');
						expectSwaggerParamError(res, 'limit');
						expectSwaggerParamError(res, 'offset');
						expectSwaggerParamError(res, 'sort');
					});
				});
			});

			it.skip('using no params should be ok', () => {
				return UnconfirmedEndpoint.makeRequest({}, 200).then(res => {
					expect(res.body.meta.count).to.be.at.least(numOfTransactions);
				});
			});

			describe('id', () => {
				it('using invalid id should fail', () => {
					return UnconfirmedEndpoint.makeRequest({ id: '79fjdfd' }, 400).then(
						res => {
							expectSwaggerParamError(res, 'id');
						}
					);
				});

				it.skip('using valid id should be ok', () => {
					var transactionInCheck = transactionList[0];

					return UnconfirmedEndpoint.makeRequest(
						{ id: transactionInCheck.id },
						200
					).then(res => {
						expect(res.body.data).to.not.empty;
						expect(res.body.data).to.has.length(1);
						expect(res.body.data[0].id).to.be.equal(transactionInCheck.id);
					});
				});

				it('using valid but unknown id should be ok', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ id: '1111111111111111' },
						200
					).then(res => {
						expect(res.body.data).to.be.empty;
					});
				});
			});

			describe('type', () => {
				it('using invalid type should fail', () => {
					return UnconfirmedEndpoint.makeRequest({ type: 8 }, 400).then(res => {
						expectSwaggerParamError(res, 'type');
					});
				});

				it.skip('using valid type should be ok', () => {
					var transactionInCheck = transactionList[0];

					return UnconfirmedEndpoint.makeRequest(
						{ type: transactionInCheck.type },
						200
					).then(res => {
						expect(res.body.data).to.not.empty;
						expect(res.body.data.length).to.be.at.least(numOfTransactions);
						res.body.data.map(function(transaction) {
							expect(transaction.type).to.be.equal(transactionInCheck.type);
						});
					});
				});
			});

			describe('senderId', () => {
				it('using invalid senderId should fail', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ senderId: '79fjdfd' },
						400
					).then(res => {
						expectSwaggerParamError(res, 'senderId');
					});
				});

				it.skip('using valid senderId should be ok', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ senderId: accountFixtures.genesis.address },
						200
					).then(res => {
						expect(res.body.data).to.not.empty;
						expect(res.body.data.length).to.be.at.least(numOfTransactions);
						res.body.data.map(function(transaction) {
							expect(transaction.senderId).to.be.equal(
								accountFixtures.genesis.address
							);
						});
					});
				});

				it('using valid but unknown senderId should be ok', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ senderId: '1631373961111634666L' },
						200
					).then(res => {
						expect(res.body.data).to.be.empty;
					});
				});
			});

			describe('senderPublicKey', () => {
				it('using invalid senderPublicKey should fail', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ senderPublicKey: '79fjdfd' },
						400
					).then(res => {
						expectSwaggerParamError(res, 'senderPublicKey');
					});
				});

				it.skip('using valid senderPublicKey should be ok', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ senderPublicKey: accountFixtures.genesis.publicKey },
						200
					).then(res => {
						expect(res.body.data).to.not.empty;
						expect(res.body.data.length).to.be.at.least(numOfTransactions);
						res.body.data.map(function(transaction) {
							expect(transaction.senderPublicKey).to.be.equal(
								accountFixtures.genesis.publicKey
							);
						});
					});
				});

				it('using valid but unknown senderPublicKey should be ok', () => {
					return UnconfirmedEndpoint.makeRequest(
						{
							senderPublicKey:
								'c094ebee7ec0c50ebeeaaaa8655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						},
						200
					).then(res => {
						expect(res.body.data).to.be.empty;
					});
				});
			});

			describe('recipientId', () => {
				it('using invalid recipientId should fail', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ recipientId: '79fjdfd' },
						400
					).then(res => {
						expectSwaggerParamError(res, 'recipientId');
					});
				});

				it.skip('using valid recipientId should be ok', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ recipientId: account.address },
						200
					).then(res => {
						expect(res.body.data).to.not.empty;
						expect(res.body.data.length).to.be.at.least(numOfTransactions);
						res.body.data.map(function(transaction) {
							expect(transaction.recipientId).to.be.equal(account.address);
						});
					});
				});

				it('using valid but unknown recipientId should be ok', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ recipientId: '1631373961111634666L' },
						200
					).then(res => {
						expect(res.body.data).to.be.empty;
					});
				});
			});

			describe('recipientPublicKey', () => {
				it('using invalid recipientPublicKey should fail', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ recipientPublicKey: '79fjdfd' },
						400
					).then(res => {
						expectSwaggerParamError(res, 'recipientPublicKey');
					});
				});

				it.skip('using valid recipientPublicKey should be ok', () => {
					return UnconfirmedEndpoint.makeRequest(
						{ recipientPublicKey: account.publicKey },
						200
					).then(res => {
						expect(res.body.data).to.not.empty;
						expect(res.body.data.length).to.be.at.least(numOfTransactions);
						res.body.data.map(function(transaction) {
							// TODO: Unprocessed transactions don't have recipientPublicKey attribute, so matched address
							expect(transaction.recipientId).to.be.equal(account.address);
						});
					});
				});

				it('using valid but unknown recipientPublicKey should be ok', () => {
					return UnconfirmedEndpoint.makeRequest(
						{
							recipientPublicKey:
								'c094ebee7ec0c50ebeeaaaa8655e089f6e1a604b83bcaa760293c61e0f18ab6f',
						},
						200
					).then(res => {
						expect(res.body.data).to.be.empty;
					});
				});
			});

			describe('limit', () => {
				it('using limit < 0 should fail', () => {
					return UnconfirmedEndpoint.makeRequest({ limit: -1 }, 400).then(
						res => {
							expectSwaggerParamError(res, 'limit');
						}
					);
				});

				it('using limit > 100 should fail', () => {
					return UnconfirmedEndpoint.makeRequest({ limit: 101 }, 400).then(
						res => {
							expectSwaggerParamError(res, 'limit');
						}
					);
				});

				it.skip('using limit = 2 should return 2 transactions', () => {
					return UnconfirmedEndpoint.makeRequest({ limit: 2 }, 200).then(
						res => {
							expect(res.body.data).to.not.be.empty;
							expect(res.body.data.length).to.be.at.most(2);
						}
					);
				});
			});

			describe('offset', () => {
				it('using offset="one" should fail', () => {
					return UnconfirmedEndpoint.makeRequest({ offset: 'one' }, 400).then(
						res => {
							expectSwaggerParamError(res, 'offset');
						}
					);
				});

				it.skip('using offset=1 should be ok', () => {
					var firstTransaction = null;

					return UnconfirmedEndpoint.makeRequest({ offset: 0, limit: 2 }, 200)
						.then(res => {
							firstTransaction = res.body.data[0];

							return UnconfirmedEndpoint.makeRequest(
								{ offset: 1, limit: 2 },
								200
							);
						})
						.then(res => {
							res.body.data.forEach(transaction => {
								expect(transaction.id).to.not.equal(firstTransaction.id);
							});
						});
				});
			});

			describe.skip('sort', () => {
				describe('amount', () => {
					it('sorted by amount:asc should be ok', () => {
						return UnconfirmedEndpoint.makeRequest(
							{ sort: 'amount:asc' },
							200
						).then(res => {
							expect(res.body.data).to.not.be.empty;

							var values = _.map(res.body.data, 'amount').map(value => {
								return parseInt(value);
							});

							expect(_(_.clone(values)).sortNumbers('asc')).to.be.eql(values);
						});
					});

					it('sorted by amount:desc should be ok', () => {
						return UnconfirmedEndpoint.makeRequest(
							{ sort: 'amount:desc' },
							200
						).then(res => {
							expect(res.body.data).to.not.be.empty;

							var values = _.map(res.body.data, 'amount').map(value => {
								return parseInt(value);
							});

							expect(_(_.clone(values)).sortNumbers('desc')).to.be.eql(values);
						});
					});
				});

				describe('fee', () => {
					it('sorted by fee:asc should be ok', () => {
						return UnconfirmedEndpoint.makeRequest(
							{ sort: 'fee:asc' },
							200
						).then(res => {
							expect(res.body.data).to.not.be.empty;

							var values = _.map(res.body.data, 'fee').map(value => {
								return parseInt(value);
							});

							expect(_(_.clone(values)).sortNumbers('asc')).to.be.eql(values);
						});
					});

					it('sorted by fee:desc should be ok', () => {
						return UnconfirmedEndpoint.makeRequest(
							{ sort: 'fee:desc' },
							200
						).then(res => {
							expect(res.body.data).to.not.be.empty;

							var values = _.map(res.body.data, 'fee').map(value => {
								return parseInt(value);
							});

							expect(_(_.clone(values)).sortNumbers('desc')).to.be.eql(values);
						});
					});
				});

				describe('type', () => {
					it('sorted by fee:asc should be ok', () => {
						return UnconfirmedEndpoint.makeRequest(
							{ sort: 'type:asc' },
							200
						).then(res => {
							expect(res.body.data).to.not.be.empty;

							expect(
								_(res.body.data)
									.map('type')
									.sortNumbers('asc')
							).to.be.eql(_.map(res.body.data, 'type'));
						});
					});

					it('sorted by fee:desc should be ok', () => {
						return UnconfirmedEndpoint.makeRequest(
							{ sort: 'type:desc' },
							200
						).then(res => {
							expect(res.body.data).to.not.be.empty;

							expect(
								_(res.body.data)
									.map('type')
									.sortNumbers('desc')
							).to.be.eql(_.map(res.body.data, 'type'));
						});
					});
				});

				describe('timestamp', () => {
					it('sorted by timestamp:asc should be ok', () => {
						return UnconfirmedEndpoint.makeRequest(
							{ sort: 'timestamp:asc' },
							200
						).then(res => {
							expect(res.body.data).to.not.be.empty;

							expect(
								_(res.body.data)
									.map('timestamp')
									.sortNumbers('asc')
							).to.be.eql(_.map(res.body.data, 'timestamp'));
						});
					});

					it('sorted by timestamp:desc should be ok', () => {
						return UnconfirmedEndpoint.makeRequest(
							{ sort: 'timestamp:desc' },
							200
						).then(res => {
							expect(res.body.data).to.not.be.empty;

							expect(
								_(res.body.data)
									.map('timestamp')
									.sortNumbers('desc')
							).to.be.eql(_.map(res.body.data, 'timestamp'));
						});
					});
				});

				it('using any other sort field should fail', () => {
					return UnconfirmedEndpoint.makeRequest({ sort: 'id:asc' }, 400).then(
						res => {
							expectSwaggerParamError(res, 'sort');
						}
					);
				});
			});
		});
	});
});
