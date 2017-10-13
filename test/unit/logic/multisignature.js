'use strict';/*eslint*/

var node = require('./../../node.js');
var ed = require('../../../helpers/ed');
var crypto = require('crypto');
var async = require('async');

var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');
var _  = require('lodash');
var transactionTypes = require('../../../helpers/transactionTypes');
var constants = require('../../../helpers/constants');
var DBSandbox = require('../../common/globalBefore').DBSandbox;

var modulesLoader = require('../../common/modulesLoader');
var validPassword = 'robust weapon course unknown head trial pencil latin acid';
var validKeypair = ed.makeKeypair(crypto.createHash('sha256').update(validPassword, 'utf8').digest());

var validSender = {
	address: '16313739661670634666L',
	publicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	password: 'wagon stock borrow episode laundry kitten salute link globe zero feed marble',
	balance: '10000000000000000'
};

var senderHash = crypto.createHash('sha256').update(validSender.password, 'utf8').digest();
var senderKeypair = ed.makeKeypair(senderHash);

var multiSigAccount1 = {
	balance: '0',
	password: 'jcja4vxibnw5dayk3xr',
	secondPassword: '0j64m005jyjj37bpdgqfr',
	username: 'LP',
	publicKey: 'bd6d0388dcc0b07ab2035689c60a78d3ebb27901c5a5ed9a07262eab1a2e9bd2',
	address: '5936324907841470379L'
};

var multiSigAccount2 = {
	address: '10881167371402274308L',
	publicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	password: 'actress route auction pudding shiver crater forum liquid blouse imitate seven front',
	balance: '0',
	delegateName: 'genesis_100'
};

describe('multisignature', function () {

	var transactionLogic;
	var multisignature;
	var sender;

	var dbSandbox;

	before(function (done) {
		dbSandbox = new DBSandbox(node.config.db, 'lisk_test_logic_multisignature');
		dbSandbox.create(function (err, __db) {
			node.initApplication(function (err, scope) {
				transactionLogic = scope.logic.transaction;
				multisignature = scope.logic.multisignature;
				done();
			}, {db: __db});
		});
	});

	after(function (done) {
		dbSandbox.destroy();
		node.appCleanup(done);
	});

	beforeEach(function () {
		sender = _.cloneDeep(validSender);
	});

	describe('objectNormalize', function () {

		describe('min', function () {

			it('should return error when value is not an integer', function () {
				var min = '2';
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '+' + multiSigAccount2.publicKey], 1, 2);
				transaction.asset.multisignature.min = min;

				expect(function () {
					multisignature.objectNormalize.call(transactionLogic, transaction);
				}).to.throw('Failed to validate multisignature schema: Expected type integer but found type string');
			});

			it('should return error when value is a negative integer', function () {
				var min = -1;
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '+' + multiSigAccount2.publicKey], 1, 2);
				transaction.asset.multisignature.min = min;

				expect(function () {
					multisignature.objectNormalize.call(transactionLogic, transaction);
				}).to.throw('Failed to validate multisignature schema: Value -1 is less than minimum 1');
			});

			it('should return error when value is smaller than minimum acceptable value', function () {
				var min = constants.multisigConstraints.min.minimum - 1;
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '+' + multiSigAccount2.publicKey], 1, min);

				expect(function () {
					multisignature.objectNormalize.call(transactionLogic, transaction);
				}).to.throw('Failed to validate multisignature schema: Value 0 is less than minimum 1');
			});

			it('should return error when value is greater than maximum acceptable value', function () {
				var min = constants.multisigConstraints.min.maximum + 1;
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], 1, min);

				expect(function () {
					multisignature.objectNormalize.call(transactionLogic, transaction);
				}).to.throw('Failed to validate multisignature schema: Value 16 is greater than maximum 15');
			});

			it('should return error when value is an overflow number', function () {
				var min = Number.MAX_VALUE + 1;
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], 1, 2);
				transaction.asset.multisignature.min = min;

				expect(function () {
					multisignature.objectNormalize.call(transactionLogic, transaction);
				}).to.throw('Failed to validate multisignature schema: Value 1.7976931348623157e+308 is greater than maximum 15');
			});
		});

		describe('lifetime', function () {

			it('should return error when value is not an integer', function () {
				var lifetime = '2';
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], 1, 2);
				transaction.asset.multisignature.lifetime = lifetime;

				expect(function () {
					multisignature.objectNormalize.call(transactionLogic, transaction);
				}).to.throw('Failed to validate multisignature schema: Expected type integer but found type string');
			});

			it('should return error when value is smaller than minimum acceptable value', function () {
				var lifetime = node.constants.multisigConstraints.lifetime.minimum - 1;
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], lifetime, 2);

				expect(function () {
					multisignature.objectNormalize.call(transactionLogic, transaction);
				}).to.throw('Failed to validate multisignature schema: Value 0 is less than minimum 1');
			});

			it('should return error when value is greater than maximum acceptable value', function () {
				var lifetime = node.constants.multisigConstraints.lifetime.maximum + 1;
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], lifetime, 2);

				expect(function () {
					multisignature.objectNormalize.call(transactionLogic, transaction);
				}).to.throw('Failed to validate multisignature schema: Value 73 is greater than maximum 72');
			});

			it('should return error when value is an overflow number', function () {
				var lifetime = Number.MAX_VALUE;
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], 1, 2);
				transaction.asset.multisignature.lifetime = lifetime;

				expect(function () {
					multisignature.objectNormalize.call(transactionLogic, transaction);
				}).to.throw('Failed to validate multisignature schema: Value 1.7976931348623157e+308 is greater than maximum 72');
			});
		});

		describe('keysgroup', function () {

			it('should return error when it is not an array', function () {
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, [''], 1, 2);
				transaction.asset.multisignature.keysgroup = '';

				expect(function () {
					multisignature.objectNormalize.call(transactionLogic, transaction);
				}).to.throw('Failed to validate multisignature schema: Expected type array but found type string');
			});

			it('should return error when array length is smaller than minimum acceptable value', function () {
				var keysgroup = [];
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, keysgroup, 1, 2);

				expect(function () {
					multisignature.objectNormalize.call(transactionLogic, transaction);
				}).to.throw('Failed to validate multisignature schema: Array is too short (0), minimum 1');
			});

			it('should return error when array length is greater than maximum acceptable value', function () {
				var keysgroup = Array.apply(null, Array(constants.multisigConstraints.keysgroup.maxItems + 1)).map(function () {
					return '+' + node.lisk.crypto.getKeys(node.randomPassword()).publicKey;
				});
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, keysgroup, 1, 2);

				expect(function () {
					multisignature.objectNormalize.call(transactionLogic, transaction);
				}).to.throw('Failed to validate multisignature schema: Array is too long (16), maximum 15');
			});
		});

		it('should return transaction when asset is valid', function () {
			var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, Array.apply(null, Array(10)).map(function () {
				return '+' + node.lisk.crypto.getKeys(node.randomPassword()).publicKey;
			}), 1, 2);

			expect(multisignature.objectNormalize(transaction)).to.eql(transaction);
		});
	});

	describe('verify', function () {

		describe('from transaction.verify tests', function () {

			it('should return error when multisignature keysgroup has an entry which does not start with + character', function (done) {
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], 1, 2);
				transaction.senderId = node.gAccount.address;

				transactionLogic.verify(transaction, node.gAccount, function (err, transaction) {
					expect(err).to.equal('Invalid math operator in multisignature keysgroup');
					done();
				});
			});

			it('should return error when multisignature keysgroup has an entry which is null', function (done) {
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, null], 1, 2);
				transaction.senderId = node.gAccount.address;

				transactionLogic.verify(transaction, node.gAccount, function (err, transaction) {
					expect(err).to.equal('Invalid member in keysgroup');
					done();
				});
			});

			it('should return error when multisignature keysgroup has an entry which is undefined', function (done) {
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, undefined], 1, 2);
				transaction.senderId = node.gAccount.address;

				transactionLogic.verify(transaction, node.gAccount, function (err, transaction) {
					expect(err).to.equal('Invalid member in keysgroup');
					done();
				});
			});

			it('should return error when multisignature keysgroup has an entry which is an integer', function (done) {
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, 12], 1, 2);
				transaction.senderId = node.gAccount.address;

				transactionLogic.verify(transaction, node.gAccount, function (err, transaction) {
					expect(err).to.equal('Invalid member in keysgroup');
					done();
				});
			});

			it('should be okay for valid transaction', function (done) {
				var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '+' + multiSigAccount2.publicKey], 1, 2);
				transaction.senderId = node.gAccount.address;

				transactionLogic.verify(transaction, node.gAccount, function (err, transaction) {
					expect(err).to.not.exist;
					done();
				});
			});
		});
	});

	describe('from multisignature.verify tests', function () {

		it('should return error when min value is smaller than minimum acceptable value', function (done) {
			var min = constants.multisigConstraints.min.minimum - 1;
			var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '+' + multiSigAccount2.publicKey], 1, 1);
			transaction.asset.multisignature.min = min;

			multisignature.verify(transaction, node.gAccount, function (err) {
				expect(err).to.equal('Invalid multisignature min. Must be between 1 and 15');
				done();
			});
		});

		it('should return error when min value is greater than maximum acceptable value', function (done) {
			var min = constants.multisigConstraints.min.maximum + 1;
			var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '+' + multiSigAccount2.publicKey], 1, min);

			multisignature.verify(transaction, node.gAccount, function (err) {
				expect(err).to.equal('Invalid multisignature min. Must be between 1 and 15');
				done();
			});
		});

		it('should return error when multisignature keysgroup has an entry which does not start with + character', function (done) {
			var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '-' + multiSigAccount2.publicKey], 1, 2);
			transaction.senderId = node.gAccount.address;

			multisignature.verify(transaction, node.gAccount, function (err, transaction) {
				expect(err).to.equal('Invalid math operator in multisignature keysgroup');
				done();
			});
		});

		it('should return error when multisignature keysgroup has an entry which is null', function (done) {
			var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, null], 1, 2);
			transaction.senderId = node.gAccount.address;

			multisignature.verify(transaction, node.gAccount, function (err, transaction) {
				expect(err).to.equal('Invalid member in keysgroup');
				done();
			});
		});

		it('should return error when multisignature keysgroup has an entry which is undefined', function (done) {
			var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, undefined], 1, 2);
			transaction.senderId = node.gAccount.address;

			multisignature.verify(transaction, node.gAccount, function (err, transaction) {
				expect(err).to.equal('Invalid member in keysgroup');
				done();
			});
		});

		it('should return error when multisignature keysgroup has an entry which is an integer', function (done) {
			var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, 12], 1, 2);
			transaction.senderId = node.gAccount.address;

			multisignature.verify(transaction, node.gAccount, function (err, transaction) {
				expect(err).to.equal('Invalid member in keysgroup');
				done();
			});
		});

		it('should be okay for valid transaction', function (done) {
			var transaction	= node.lisk.multisignature.createMultisignature(node.gAccount.password, null, ['+' + multiSigAccount1.publicKey, '+' + multiSigAccount2.publicKey], 1, 2);
			transaction.senderId = node.gAccount.address;

			multisignature.verify(transaction, node.gAccount, function (err, transaction) {
				expect(err).to.not.exist;
				done();
			});
		});
	});
});
