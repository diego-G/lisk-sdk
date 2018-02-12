'use strict';

var node = require('./../node.js');
var genesisDelegates = require('./../genesisDelegates.json');

function postTransaction (transaction, done) {
	node.post('/peer/transactions', {
		transaction: transaction
	}, done);
}

function postTransactions (transactions, done) {
	node.post('/peer/transactions', {
		transactions: transactions
	}, done);
}

describe('POST /peer/transactions @slow', function () {

	describe('sending 1000 bundled transfers to random addresses', function () {

		var transactions = [];
		var maximum = 1000;
		var count = 1;

		before(function (done) {
			node.async.doUntil(function (next) {
				var bundled = [];

				for (var i = 0; i < node.config.broadcasts.releaseLimit; i++) {
					var transaction = node.lisk.transaction.createTransaction(
						node.randomAccount().address,
						node.randomNumber(100000000, 1000000000),
						node.gAccount.password
					);

					transactions.push(transaction);
					bundled.push(transaction);
					count++;
				}

				postTransactions(bundled, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					next();
				});
			}, function () {
				return (count >= maximum);
			}, function (err) {
				done(err);
			});
		});

		it('should confirm all transactions', function (done) {
			var blocksToWait = Math.ceil(maximum / node.constants.maxTxsPerBlock);
			node.waitForBlocks(blocksToWait, function (err) {
				node.async.eachSeries(transactions, function (transaction, eachSeriesCb) {
					node.get('/api/transactions/get?id=' + transaction.id, function (err, res) {
						node.expect(res.body).to.have.property('success').to.be.ok;
						node.expect(res.body).to.have.property('transaction').that.is.an('object');
						return setImmediate(eachSeriesCb);
					});
				}, done);
			});
		}).timeout(500000);
	});

	describe('sending 1000 single transfers with amount from 26 to 50 LSK to random addresses', function () {

		var transactions = [];
		var accounts = [];
		var maximum = 1000;
		var count = 1;

		before(function (done) {
			node.async.doUntil(function (next) {
				var randomAccount = node.randomAccount();
				accounts.push(randomAccount);
				var transaction = node.lisk.transaction.createTransaction(
					randomAccount.address,
					node.randomNumber(2600000000, 5000000000),
					node.gAccount.password
				);

				postTransaction(transaction, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transactionId').to.equal(transaction.id);
					transactions.push(transaction);
					count++;
					next();
				});
			}, function () {
				return (count >= maximum);
			}, function (err) {
				done(err);
			});
		});

		it('should confirm all transactions', function (done) {
			var blocksToWait = Math.ceil(maximum / node.constants.maxTxsPerBlock);
			node.waitForBlocks(blocksToWait, function () {
				node.async.eachSeries(transactions, function (transaction, eachSeriesCb) {
					node.get('/api/transactions/get?id=' + transaction.id, function (err, res) {
						node.expect(res.body).to.have.property('success').to.be.ok;
						node.expect(res.body).to.have.property('transaction').that.is.an('object');
						return setImmediate(eachSeriesCb);
					});
				}, done);
			});
		}).timeout(500000);

		describe('having 1000 confirmed type 0 transactions', function () {
			describe('sending 1000 type 3 transactions for genesis delegates', function () {

				function convertStringToDeterministicNumber (str) {
					return str.split('').reduce(function (strBytesSum, letter) {
						return letter.charCodeAt(0) + strBytesSum;
					}, 0);
				}

				var votesTransactions = [];

				before(function (done) {
					node.async.each(accounts, function (account, eachCb) {
						var randomDelegateIndex = convertStringToDeterministicNumber(account.publicKey) % 101;
						var voteTransaction = node.lisk.vote.createVote(
							account.password,
							['+' + genesisDelegates.delegates[randomDelegateIndex].publicKey]
						);
						postTransaction(voteTransaction, function (err, res) {
							node.expect(res.body).to.have.property('success').to.be.ok;
							node.expect(res.body).to.have.property('transactionId').to.equal(voteTransaction.id);
							votesTransactions.push(voteTransaction);
							eachCb(err);
						});
					}, done);
				});

				it('should confirm all votes transactions', function (done) {
					var blocksToWait = Math.ceil(maximum / node.constants.maxTxsPerBlock) + 1;
					node.waitForBlocks(blocksToWait, function () {
						node.async.eachSeries(votesTransactions, function (delegateTransaction, eachSeriesCb) {
							node.get('/api/transactions/get?id=' + delegateTransaction.id, function (err, res) {
								node.expect(res.body).to.have.property('success').to.be.ok;
								node.expect(res.body).to.have.property('transaction').that.is.an('object');
								return setImmediate(eachSeriesCb);
							});
						}, done);
					});
				}).timeout(500000);
			});
		});
	});
});
