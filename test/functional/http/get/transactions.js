'use strict';

var test = require('../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;
var Promise = require('bluebird');

var _ = test._;
var accountFixtures = require('../../../fixtures/accounts');
var genesisblock = require('../../../data/genesisBlock.json');

var transactionSortFields = require('../../../../sql/transactions').sortFields;
var transactionTypes = require('../../../../helpers/transactionTypes');
var constants = require('../../../../helpers/constants');

var modulesLoader = require('../../../common/modulesLoader');
var randomUtil = require('../../../common/utils/random');
var normalizer = require('../../../common/utils/normalizer');
var waitFor = require('../../../common/utils/waitFor');
var apiHelpers = require('../../../common/helpers/api');
var getTransactionsPromise = apiHelpers.getTransactionsPromise;
var swaggerEndpoint = require('../../../common/swaggerSpec');
var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;
var slots = require('../../../../helpers/slots');

describe('GET /api/transactions', function () {

	var transactionsEndpoint = new swaggerEndpoint('GET /transactions');
	var transactionList = [];

	var account = randomUtil.account();
	var account2 = randomUtil.account();
	var minAmount = 20 * normalizer; // 20 LSK
	var maxAmount = 100 * normalizer; // 100 LSK

	// Crediting accounts
	before(function () {

		var promises = [];

		var transaction1 = lisk.transaction.createTransaction(account.address, maxAmount, accountFixtures.genesis.password);
		var transaction2 = lisk.transaction.createTransaction(account2.address, minAmount, accountFixtures.genesis.password);
		promises.push(apiHelpers.sendTransactionPromise(transaction1));
		promises.push(apiHelpers.sendTransactionPromise(transaction2));
		return Promise.all(promises).then(function (results) {
			transactionList.push(transaction1);
			transactionList.push(transaction2);
			return waitFor.confirmations(_.map(transactionList, 'id'));
		});
	});

	describe('from cache', function () {

		var cache;
		var getJsonForKeyPromise;
		var url = transactionsEndpoint.getPath();

		before(function (done) {
			test.config.cacheEnabled = true;
			modulesLoader.initCache(function (err, __cache) {
				cache = __cache;
				getJsonForKeyPromise = Promise.promisify(cache.getJsonForKey);
				expect(err).to.not.exist;
				expect(__cache).to.be.an('object');
				return done(err);
			});
		});

		afterEach(function (done) {
			cache.flushDb(function (err, status) {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');
				done(err);
			});
		});

		after(function (done) {
			cache.quit(done);
		});

		it('cache transactions by the url and parameters when response is a success', function () {
			var params = [
				'blockId=' + '1',
				'senderAddress=' + accountFixtures.genesis.address,
				'recipientAddress=' + account.address,
			];

			return transactionsEndpoint.makeRequest({
				blockId: '1',
				senderAddress: accountFixtures.genesis.address,
				recipientAddress: account.address
			}, 200).then(function (res) {
				return Promise.all([0, 10, 100].map(function (delay) {
					return Promise.delay(delay).then(function () {
						return getJsonForKeyPromise(url + '?' + params.join('&'));
					});
				})).then(function (responses) {
					expect(responses).to.deep.include(res.body);
				});
			});
		});

		it('should not cache if response is not a success', function () {
			var params = [
				'whatever:senderId=' + accountFixtures.genesis.address
			];

			return transactionsEndpoint.makeRequest({unknownParam: 'invalid'}, 400).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message');
				return getJsonForKeyPromise(url + params.join('&')).then(function (response) {
					expect(response).to.eql(null);
				});
			});
		});
	});

	describe('?', function () {

		describe('with wrong input', function () {

			it('using valid array-like parameters should fail', function () {
				return transactionsEndpoint.makeRequest({
					blockId: '1',
					senderAddress: accountFixtures.genesis.address + ',' + account.address,
					senderPublicKey: accountFixtures.genesis.publicKey,
					recipientPublicKey: accountFixtures.genesis.publicKey + ',' + account.publicKey,
					sort: 'amount:asc'
				}, 400).then(function (res) {
					expectSwaggerParamError(res, 'senderAddress');
				});
			});

			it('using invalid field name should fail', function () {
				return transactionsEndpoint.makeRequest({
					blockId: '1',
					whatever: accountFixtures.genesis.address
				}, 400).then(function (res) {
					expectSwaggerParamError(res, 'whatever');
				});
			});

			it('using invalid condition should fail', function () {
				return transactionsEndpoint.makeRequest({
					'whatever:senderAddress': accountFixtures.genesis.address
				}, 400).then(function (res) {
					expectSwaggerParamError(res, 'whatever:senderAddress');
				});
			});

			it('using invalid field name (x:z) should fail', function () {
				return transactionsEndpoint.makeRequest({
					'and:senderAddress': accountFixtures.genesis.address
				}, 400).then(function (res) {
					expectSwaggerParamError(res, 'and:senderAddress');
				});
			});

			it('using empty parameter should fail', function () {
				return transactionsEndpoint.makeRequest({
					publicKey: ''
				}, 400).then(function (res) {
					expectSwaggerParamError(res, 'publicKey');
				});
			});

			it('using completely invalid fields should fail', function () {
				return transactionsEndpoint.makeRequest({
					blockId: 'invalid',
					senderAddress: 'invalid',
					recipientAddress: 'invalid',
					limit: 'invalid',
					offset: 'invalid',
					sort: 'invalid'
				}, 400).then(function (res) {
					expectSwaggerParamError(res, 'blockId');
					expectSwaggerParamError(res, 'senderAddress');
					expectSwaggerParamError(res, 'recipientAddress');
					expectSwaggerParamError(res, 'limit');
					expectSwaggerParamError(res, 'offset');
					expectSwaggerParamError(res, 'sort');
				});
			});

			it('using partially invalid fields should fail', function () {
				return transactionsEndpoint.makeRequest({
					blockId: 'invalid',
					senderAddress: 'invalid',
					recipientAddress: account.address,
					limit: 'invalid',
					offset: 'invalid',
					sort: 'invalid'
				}, 400).then(function (res) {
					expectSwaggerParamError(res, 'blockId');
					expectSwaggerParamError(res, 'senderAddress');
					expectSwaggerParamError(res, 'limit');
					expectSwaggerParamError(res, 'offset');
					expectSwaggerParamError(res, 'sort');
				});
			});

		});

		it('using no params should be ok', function () {
			return transactionsEndpoint.makeRequest({}, 200).then(function (res) {
				res.body.data.should.not.empty;
			});
		});

		describe('id', function () {

			it('using valid id should be ok', function () {
				var transactionInCheck = transactionList[0];

				return transactionsEndpoint.makeRequest({transactionId: transactionInCheck.id}, 200).then(function (res) {
					res.body.data.should.not.empty;
					res.body.data.should.has.length(1);
					res.body.data[0].id.should.be.equal(transactionInCheck.id);
				});
			});

			it('using invalid id should fail', function () {
				return transactionsEndpoint.makeRequest({transactionId: undefined}, 400).then(function (res) {
					expectSwaggerParamError(res, 'transactionId');
				});
			});

			it('should get transaction with asset for id', function () {
				var transactionInCheck = genesisblock.transactions.find(function (trs) {
					// Vote type transaction from genesisBlock
					return trs.id === '9314232245035524467';
				});

				return transactionsEndpoint.makeRequest({transactionId: transactionInCheck.id}, 200).then(function (res) {
					res.body.data.should.not.empty;
					res.body.data.should.has.length(1);

					var transaction = res.body.data[0];

					transaction.id.should.be.equal(transactionInCheck.id);
					transaction.type.should.be.equal(transactionTypes.VOTE);
					transaction.type.should.be.equal(transactionInCheck.type);
					transaction.amount.should.be.equal(transactionInCheck.amount.toString());
					transaction.fee.should.be.equal(transactionInCheck.fee.toString());
					transaction.recipientAddress.should.be.equal(transactionInCheck.recipientId);
					transaction.senderAddress.should.be.equal(transactionInCheck.senderId);
					transaction.asset.should.be.eql(transactionInCheck.asset);
				});
			});
		});

		describe('type', function () {

			it('using invalid type should fail', function () {
				return transactionsEndpoint.makeRequest({type: 8}, 400).then(function (res) {
					expectSwaggerParamError(res, 'type');
				});
			});

			it('using type should be ok', function () {
				return transactionsEndpoint.makeRequest({type: transactionTypes.SEND}, 200).then(function (res) {
					res.body.data.should.not.empty;
					res.body.data.map(function (transaction) {
						transaction.type.should.be.equal(transactionTypes.SEND);
					});
				});
			});
		});

		describe('senderAddress', function () {

			it('using invalid senderAddress should fail', function () {
				return transactionsEndpoint.makeRequest({senderAddress: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'senderAddress');
				});
			});

			it('using one senderAddress should return transactions', function () {
				return transactionsEndpoint.makeRequest({senderAddress: accountFixtures.genesis.address}, 200).then(function (res) {
					res.body.data.should.not.empty;

					res.body.data.map(function (transaction) {
						transaction.senderAddress.should.be.equal(accountFixtures.genesis.address);
					});
				});
			});

			it('using multiple senderAddress should fail', function () {
				return transactionsEndpoint.makeRequest({senderAddress: [accountFixtures.genesis.address, accountFixtures.existingDelegate.address]}, 400).then(function (res) {
					expectSwaggerParamError(res, 'senderAddress');
				});
			});
		});

		describe('senderPublicKey', function () {

			it('using invalid senderPublicKey should fail', function () {
				return transactionsEndpoint.makeRequest({senderPublicKey: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'senderPublicKey');
				});
			});

			it('using one senderPublicKey should return transactions', function () {
				return transactionsEndpoint.makeRequest({senderPublicKey: accountFixtures.genesis.publicKey}, 200).then(function (res) {
					res.body.data.should.not.empty;

					res.body.data.map(function (transaction) {
						transaction.senderPublicKey.should.be.equal(accountFixtures.genesis.publicKey);
					});
				});
			});

			it('using multiple senderPublicKey should fail', function () {
				return transactionsEndpoint.makeRequest({senderPublicKey: [accountFixtures.genesis.publicKey, accountFixtures.existingDelegate.publicKey]}, 400).then(function (res) {
					expectSwaggerParamError(res, 'senderPublicKey');
				});
			});
		});

		describe('recipientAddress', function () {

			it('using invalid recipientAddress should fail', function () {
				return transactionsEndpoint.makeRequest({recipientAddress: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'recipientAddress');
				});
			});

			it('using one recipientAddress should return transactions', function () {
				return transactionsEndpoint.makeRequest({recipientAddress: accountFixtures.genesis.address}, 200).then(function (res) {
					res.body.data.should.not.empty;

					res.body.data.map(function (transaction) {
						transaction.recipientAddress.should.be.equal(accountFixtures.genesis.address);
					});
				});
			});

			it('using multiple recipientAddress should fail', function () {
				return transactionsEndpoint.makeRequest({recipientAddress: [accountFixtures.genesis.address, accountFixtures.existingDelegate.address]}, 400).then(function (res) {
					expectSwaggerParamError(res, 'recipientAddress');
				});
			});
		});

		describe('recipientPublicKey', function () {

			it('using invalid recipientPublicKey should fail', function () {
				return transactionsEndpoint.makeRequest({recipientPublicKey: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'recipientPublicKey');
				});
			});

			it('using one recipientPublicKey should return transactions', function () {
				return transactionsEndpoint.makeRequest({recipientPublicKey: accountFixtures.genesis.publicKey}, 200).then(function (res) {
					res.body.data.should.not.empty;

					res.body.data.map(function (transaction) {
						transaction.recipientPublicKey.should.be.equal(accountFixtures.genesis.publicKey);
					});
				});
			});

			it('using multiple recipientPublicKey should fail', function () {
				return transactionsEndpoint.makeRequest({recipientPublicKey: [accountFixtures.genesis.publicKey, accountFixtures.existingDelegate.publicKey]}, 400).then(function (res) {
					expectSwaggerParamError(res, 'recipientPublicKey');
				});
			});
		});

		describe('blockId', function () {

			it('using invalid blockId should fail', function () {
				return transactionsEndpoint.makeRequest({blockId: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'blockId');
				});
			});

			it('using one blockId should return transactions', function () {
				var blockId = '6524861224470851795';

				return transactionsEndpoint.makeRequest({blockId: blockId}, 200).then(function (res) {
					res.body.data.map(function (transaction) {
						transaction.blockId.should.be.equal(blockId);
					});
				});
			});
		});

		describe('height', function () {

			it('using invalid height should fail', function () {
				return transactionsEndpoint.makeRequest({height: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'height');
				});
			});

			it('using one height should return transactions', function () {
				return transactionsEndpoint.makeRequest({height: 1}, 200).then(function (res) {
					res.body.data.map(function (transaction) {
						transaction.height.should.be.equal(1);
					});
				});
			});
		});

		describe('minAmount', function () {

			it('should get transactions with amount more than minAmount', function () {
				return transactionsEndpoint.makeRequest({minAmount: minAmount}, 200).then(function (res) {
					res.body.data.map(function (transaction) {
						parseInt(transaction.amount).should.be.at.least(minAmount);
					});
				});
			});
		});

		describe('maxAmount', function () {

			it('using minAmount with maxAmount sorted by amount and limited should be ok', function () {
				return transactionsEndpoint.makeRequest({maxAmount: maxAmount}, 200).then(function (res) {
					res.body.data.map(function (transaction) {
						parseInt(transaction.amount).should.be.at.most(maxAmount);
					});
				});
			});
		});

		describe('fromTimestamp', function () {

			it('using too small fromTimestamp should fail', function () {
				return transactionsEndpoint.makeRequest({fromTimestamp: -1}, 400).then(function (res) {
					expectSwaggerParamError(res, 'fromTimestamp');
				});
			});

			it('using valid fromTimestamp should return transactions', function () {
				// Last hour lisk time
				var queryTime = slots.getTime() - 60 * 60;

				return transactionsEndpoint.makeRequest({fromTimestamp: queryTime}, 200).then(function (res) {
					res.body.data.forEach(function (transaction) {
						transaction.timestamp.should.be.at.least(queryTime);
					});
				});
			});
		});

		describe('toTimestamp', function () {

			it('using too small toTimestamp should fail', function () {
				return transactionsEndpoint.makeRequest({toTimestamp: 1451605400}, 400).then(function (res) {
					expectSwaggerParamError(res, 'toTimestamp');
				});
			});

			it('using valid toTimestamp should return transactions', function () {
				// Current lisk time
				var queryTime = slots.getTime();

				return transactionsEndpoint.makeRequest({toTimestamp: queryTime}, 200).then(function (res) {
					res.body.data.forEach(function (transaction) {
						transaction.timestamp.should.be.at.most(queryTime);
					});
				});
			});
		});

		describe('limit', function () {

			it('using limit < 0 should fail', function () {
				return transactionsEndpoint.makeRequest({limit: -1}, 400).then(function (res) {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using limit > 100 should fail', function () {
				return transactionsEndpoint.makeRequest({limit: 101}, 400).then(function (res) {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using limit = 10 should return 10 transactions', function () {
				return transactionsEndpoint.makeRequest({limit: 10}, 200).then(function (res) {
					res.body.data.should.have.length(10);
				});
			});
		});

		describe('offset', function () {

			it('using offset="one" should fail', function () {
				return transactionsEndpoint.makeRequest({offset: 'one'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'offset');
				});
			});

			it('using offset=1 should be ok', function () {
				var firstTransaction = null;

				return transactionsEndpoint.makeRequest({offset: 0}, 200).then(function (res) {
					firstTransaction = res.body.data[0];

					return transactionsEndpoint.makeRequest({offset: 1}, 200);
				}).then(function (res) {
					res.body.data.forEach(function (transaction) {
						transaction.id.should.not.equal(firstTransaction.id);
					});
				});
			});
		});

		describe('sort', function () {

			describe('amount', function () {

				it('sorted by amount:asc should be ok', function () {
					return transactionsEndpoint.makeRequest({sort: 'amount:asc', minAmount: 100}, 200).then(function (res) {
						var values = _.map(res.body.data, 'amount').map(function (value) { return parseInt(value); });

						_(_.clone(values)).sortNumbers('asc').should.be.eql(values);
					});
				});

				it('sorted by amount:desc should be ok', function () {
					return transactionsEndpoint.makeRequest({sort: 'amount:desc'}, 200).then(function (res) {
						var values = _.map(res.body.data, 'amount').map(function (value) { return parseInt(value); });

						_(_.clone(values)).sortNumbers('desc').should.be.eql(values);
					});
				});
			});

			describe('fee', function () {

				it('sorted by fee:asc should be ok', function () {
					return transactionsEndpoint.makeRequest({sort: 'fee:asc', minAmount: 100}, 200).then(function (res) {
						var values = _.map(res.body.data, 'fee').map(function (value) { return parseInt(value); });

						_(_.clone(values)).sortNumbers('asc').should.be.eql(values);
					});
				});

				it('sorted by fee:desc should be ok', function () {
					return transactionsEndpoint.makeRequest({sort: 'fee:desc'}, 200).then(function (res) {
						var values = _.map(res.body.data, 'fee').map(function (value) { return parseInt(value); });

						_(_.clone(values)).sortNumbers('desc').should.be.eql(values);
					});
				});
			});

			describe('type', function () {

				it('sorted by fee:asc should be ok', function () {
					return transactionsEndpoint.makeRequest({sort: 'type:asc', minAmount: 100}, 200).then(function (res) {
						_(res.body.data).map('type').sortNumbers('asc').should.be.eql(_.map(res.body.data, 'type'));
					});
				});

				it('sorted by fee:desc should be ok', function () {
					return transactionsEndpoint.makeRequest({sort: 'type:desc'}, 200).then(function (res) {
						_(res.body.data).map('type').sortNumbers('desc').should.be.eql(_.map(res.body.data, 'type'));
					});
				});
			});

			describe('timestamp', function () {

				it('sorted by timestamp:asc should be ok', function () {
					return transactionsEndpoint.makeRequest({sort: 'timestamp:asc', minAmount: 100}, 200).then(function (res) {
						_(res.body.data).map('timestamp').sortNumbers('asc').should.be.eql(_.map(res.body.data, 'timestamp'));
					});
				});

				it('sorted by timestamp:desc should be ok', function () {
					return transactionsEndpoint.makeRequest({sort: 'timestamp:desc'}, 200).then(function (res) {
						_(res.body.data).map('timestamp').sortNumbers('desc').should.be.eql(_.map(res.body.data, 'timestamp'));
					});
				});
			});

			it('using sort with any of sort fields should not place NULLs first', function () {
				var transactionSortFields = ['amount:asc', 'amount:desc', 'fee:asc', 'fee:desc', 'type:asc', 'type:desc', 'timestamp:asc', 'timestamp:desc'];

				return Promise.each(transactionSortFields, function (sortField) {
					return transactionsEndpoint.makeRequest({sort: sortField}, 200).then(function (res) {

						var dividedIndices = res.body.data.reduce(function (memo, peer, index) {
							memo[peer[sortField] === null ? 'nullIndices' : 'notNullIndices'].push(index);
							return memo;
						}, { notNullIndices: [], nullIndices: [] });

						if (dividedIndices.nullIndices.length && dividedIndices.notNullIndices.length) {
							var ascOrder = function (a, b) { return a - b; };
							dividedIndices.notNullIndices.sort(ascOrder);
							dividedIndices.nullIndices.sort(ascOrder);

							expect(dividedIndices.notNullIndices[dividedIndices.notNullIndices.length - 1])
								.to.be.at.most(dividedIndices.nullIndices[0]);
						}
					});
				});
			});

			it('using any other sort field should fail', function () {
				return transactionsEndpoint.makeRequest({sort: 'height:asc'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'sort');
				});
			});
		});

		describe('minAmount & maxAmount & sort', function () {

			it('using minAmount, maxAmount sorted by amount should return sorted transactions', function () {
				return transactionsEndpoint.makeRequest({
					minAmount: minAmount,
					maxAmount: maxAmount,
					sort: 'amount:asc'
				}, 200).then(function (res) {
					var values = _.map(res.body.data, 'amount').map(function (value) { return parseInt(value); });

					_(_.clone(values)).sortNumbers('asc').should.be.eql(values);

					values.forEach(function (value) {
						value.should.be.at.most(maxAmount);
						value.should.be.at.least(minAmount);
					});
				});
			});
		});

		describe('combination of query parameters', function () {

			it('using valid parameters should be ok', function () {

				return transactionsEndpoint.makeRequest({
					senderAddress: accountFixtures.genesis.address,
					recipientAddress: account.address,
					limit: 10,
					offset: 0,
					sort: 'amount:asc'
				}, 200).then(function (res) {

					var values = _.map(res.body.data, 'amount').map(function (value) { return parseInt(value); });
					_(_.clone(values)).sortNumbers('asc').should.be.eql(values);

					res.body.data.forEach(function (transaction) {
						transaction.senderAddress.should.be.eql(accountFixtures.genesis.address);
						transaction.recipientAddress.should.be.eql(account.address);
					});
				});
			});
		});

		describe('meta', function () {

			describe('count', function () {
				it('should return count of the transactions with response', function () {
					return transactionsEndpoint.makeRequest({}, 200).then(function (res) {
						res.body.meta.count.should.be.a('number');
					});
				});
			});
		});
	});

	describe('/count', function () {

		it('should be ok', function () {
			return apiHelpers.getCountPromise('transactions').then(function (res) {
				expect(res).to.have.property('success').to.be.ok;
				expect(res).to.have.property('confirmed').that.is.an('number');
				expect(res).to.have.property('unconfirmed').that.is.an('number');
				expect(res).to.have.property('unprocessed').that.is.an('number');
				expect(res).to.have.property('unsigned').that.is.an('number');
				expect(res).to.have.property('total').that.is.an('number');
			});
		});
	});

	describe('/queued/get?id=', function () {

		it('using unknown id should be ok', function () {
			return apiHelpers.getQueuedTransactionPromise('1234').then(function (res) {
				expect(res).to.have.property('success').to.equal(false);
				expect(res).to.have.property('error').that.is.equal('Transaction not found');
			});
		});

		it('using valid transaction with data field should be ok', function () {
			var amountToSend = 123456789;
			var expectedFee = randomUtil.expectedFeeForTransactionWithData(amountToSend);
			var data = 'extra information';
			var transaction = lisk.transaction.createTransaction(account2.address, amountToSend, account.password, null, data);

			return apiHelpers.sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(200);
				expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');

				return apiHelpers.getQueuedTransactionPromise(transaction.id).then(function (result) {
					expect(result).to.have.property('success').to.equal(true);
					expect(result).to.have.property('transaction').that.is.an('object');
					expect(result.transaction.id).to.equal(transaction.id);
				});
			});
		});
	});

	describe('/queued', function () {

		it('should be ok', function () {
			return apiHelpers.getQueuedTransactionsPromise().then(function (res) {
				expect(res).to.have.property('success').to.equal(true);
				expect(res).to.have.property('transactions').that.is.an('array');
				expect(res).to.have.property('count').that.is.an('number');
			});
		});
	});

	describe('/multisignatures/get?id=', function () {

		it('using unknown id should be ok', function () {
			return apiHelpers.getMultisignaturesTransactionPromise('1234').then(function (res) {
				expect(res).to.have.property('success').to.equal(false);
				expect(res).to.have.property('error').that.is.equal('Transaction not found');
			});
		});
	});

	describe('/multisignatures', function () {

		it('should be ok', function () {
			return apiHelpers.getMultisignaturesTransactionsPromise().then(function (res) {
				expect(res).to.have.property('success').to.equal(true);
				expect(res).to.have.property('transactions').that.is.an('array');
				expect(res).to.have.property('count').that.is.an('number');
			});
		});
	});

	describe('/unconfirmed/get?id=', function () {

		var unconfirmedTransaction;

		before(function () {
			unconfirmedTransaction = lisk.transaction.createTransaction(account.address, maxAmount, accountFixtures.genesis.password);
			return apiHelpers.sendTransactionPromise(unconfirmedTransaction);
		});

		it('using valid id should be ok', function () {
			var transactionId = unconfirmedTransaction.id;
			return apiHelpers.getUnconfirmedTransactionPromise(transactionId).then(function (res) {
				expect(res).to.have.property('success');
			});
		});
	});

	describe('/unconfirmed', function () {

		it('should be ok', function () {
			return apiHelpers.getUnconfirmedTransactionsPromise().then(function (res) {
				expect(res).to.have.property('success').to.equal(true);
				expect(res).to.have.property('transactions').that.is.an('array');
				expect(res).to.have.property('count').that.is.an('number');
			});
		});
	});
});
