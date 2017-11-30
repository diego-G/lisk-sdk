'use strict';

var test = require('../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;

var shared = require('../../shared');
var localShared = require('./shared');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;

var randomUtil = require('../../../common/utils/random');
var normalizer = require('../../../common/utils/normalizer');

describe('POST /api/transactions (unconfirmed type 6 on top of type 1)', function () {

	var transaction;
	var badTransactions = [];
	var goodTransactions = [];

	var account = randomUtil.account();

	localShared.beforeUnconfirmedPhaseWithDapp(account);

	describe('inTransfer', function () {

		it('using second signature with an account that has a pending second passphrase registration should fail', function () {
			transaction = lisk.transfer.createInTransfer(randomUtil.guestbookDapp.transactionId, 10 * normalizer, account.password, account.secondPassword);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Sender does not have a second signature');
				badTransactions.push(transaction);
			});
		});

		it('using no second signature with an account that has a pending second passphrase registration should be ok', function () {
			transaction = lisk.transfer.createInTransfer(randomUtil.guestbookDapp.transactionId, 10 * normalizer, account.password);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(200);
				expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');

				// TODO: Enable when transaction pool order is fixed
				// goodTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});
});
