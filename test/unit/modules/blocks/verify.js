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

var async = require('async');
var sinon = require('sinon');
var _ = require('lodash');
var crypto = require('crypto');

var rewire = require('rewire');
var slots = require('../../../../helpers/slots');
var constants = require('../../../../helpers/constants');

var application = require('../../../common/application');
var random = require('../../../common/utils/random');
var exceptions = require('../../../../helpers/exceptions');
var modulesLoader = require('../../../common/modules_loader');
var clearDatabaseTable = require('../../../common/db_sandbox').clearDatabaseTable;
var slots = require('../../../../helpers/slots.js');
var Promise = require('bluebird');
var genesisBlock = require('../../../data/genesis_block.json');
var genesisDelegates = require('../../../data/genesis_delegates.json').delegates;

var previousBlock = {
	blockSignature: '696f78bed4d02faae05224db64e964195c39f715471ebf416b260bc01fa0148f3bddf559127b2725c222b01cededb37c7652293eb1a81affe2acdc570266b501',
	generatorPublicKey:'86499879448d1b0215d59cbf078836e3d7d9d2782d56a2274a568761bff36f19',
	height: 488,
	id: '11850828211026019525',
	numberOfTransactions: 0,
	payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
	payloadLength: 0,
	previousBlock: '8805727971083409014',
	relays: 1,
	reward: 0,
	timestamp: 32578360,
	totalAmount: 0,
	totalFee: 0,
	transactions: [],
	version: 0,
};

var validBlock = {
	blockSignature: '56d63b563e00332ec31451376f5f2665fcf7e118d45e68f8db0b00db5963b56bc6776a42d520978c1522c39545c9aff62a7d5bdcf851bf65904b2c2158870f00',
	generatorPublicKey: '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
	numberOfTransactions: 2,
	payloadHash: 'be0df321b1653c203226add63ac0d13b3411c2f4caf0a213566cbd39edb7ce3b',
	payloadLength: 494,
	height: 489,
	previousBlock: '11850828211026019525',
	reward: 0,
	timestamp: 32578370,
	totalAmount: 10000000000000000,
	totalFee: 0,
	transactions: [
		{
			type: 0,
			amount: 10000000000000000,
			fee: 0,
			timestamp: 0,
			recipientId: '16313739661670634666L',
			senderId: '1085993630748340485L',
			senderPublicKey: 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
			signature: 'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05',
			id: '1465651642158264047'
		},
		{
			type: 3,
			amount: 0,
			fee: 0,
			timestamp: 0,
			recipientId: '16313739661670634666L',
			senderId: '16313739661670634666L',
			senderPublicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
			asset: {
				votes: [
					'+9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					'+141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
					'-3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
					'-5d28e992b80172f38d3a2f9592cad740fd18d3c2e187745cd5f7badf285ed819'
				]
			},
			signature: '9f9446b527e93f81d3fb8840b02fcd1454e2b6276d3c19bd724033a01d3121dd2edb0aff61d48fad29091e222249754e8ec541132032aefaeebc312796f69e08',
			id: '9314232245035524467'
		}
	],
	version: 0,
	id: '884740302254229983'
};

var blockRewardInvalid = {
	blockSignature: 'd06c1a17c701e55aef78cefb8ce17340411d9a1a7b3bd9b6c66f815dfd7546e2ca81b3371646fcead908db57a6492e1d6910eafa0a96060760a2796aff637401',
	generatorPublicKey: '904c294899819cce0283d8d351cb10febfa0e9f0acd90a820ec8eb90a7084c37',
	numberOfTransactions: 2,
	payloadHash: 'be0df321b1653c203226add63ac0d13b3411c2f4caf0a213566cbd39edb7ce3b',
	payloadLength: 494,
	previousBlock: '11850828211026019525',
	reward: 35,
	height: 1,
	timestamp: 32578370,
	totalAmount: 10000000000000000,
	totalFee: 0,
	transactions: [
		{
			type: 0,
			amount: 10000000000000000,
			fee: 0,
			timestamp: 0,
			recipientId: '16313739661670634666L',
			senderId: '1085993630748340485L',
			senderPublicKey: 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
			signature: 'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05',
			id: '1465651642158264047'
		},
		{
			type: 3,
			amount: 0,
			fee: 0,
			timestamp: 0,
			recipientId: '16313739661670634666L',
			senderId: '16313739661670634666L',
			senderPublicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
			asset: {
				votes: [
					'+9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					'+141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
					'-3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
					'-5d28e992b80172f38d3a2f9592cad740fd18d3c2e187745cd5f7badf285ed819'
				]
			},
			signature: '9f9446b527e93f81d3fb8840b02fcd1454e2b6276d3c19bd724033a01d3121dd2edb0aff61d48fad29091e222249754e8ec541132032aefaeebc312796f69e08',
			id: '9314232245035524467'
		}
	],
	version: 0,
	id: '15635779876149546284'
};

var testAccount = {
	account: {
		username: 'test_verify',
		isDelegate: 1,
		address: '2737453412992791987L',
		publicKey: 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		balance: 5300000000000000000,
	},
	secret: 'message crash glance horror pear opera hedgehog monitor connect vague chuckle advice',
};

var userAccount = {
	account: {
		username: 'test_verify_user',
		isDelegate: 0,
		address: '2896019180726908125L',
		publicKey: '684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb',
		balance: 0,
	},
	secret: 'joy ethics cruise churn ozone asset quote renew dutch erosion seed pioneer',
};

var previousBlock1 = {
	blockSignature: '696f78bed4d02faae05224db64e964195c39f715471ebf416b260bc01fa0148f3bddf559127b2725c222b01cededb37c7652293eb1a81affe2acdc570266b501',
	generatorPublicKey: '86499879448d1b0215d59cbf078836e3d7d9d2782d56a2274a568761bff36f19',
	height: 488,
	id: '6524861224470851795',
	numberOfTransactions:0,
	payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
	payloadLength: 0,
	previousBlock: '8805727971083409014',
	relays: 1,
	reward: 0,
	timestamp: 32578360,
	totalAmount: 0,
	totalFee: 0,
	transactions: [],
	version: 0,
};

var block1;
var transactionsBlock1 = [
	{
		type: 0,
		amount: 10000000000000000,
		fee: 10000000,
		timestamp: 33514086,
		recipientId: '16313739661670634666L',
		senderId: '2737453412992791987L',
		senderPublicKey: 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		signature: '57bc34c092189e6520b1fcb5b8a1e911d5aed56910ae75d8bbf6145b780dce539949ba86a0ae8d6a33b3a2a68ce8c16eb39b448b4e53f5ca8b04a0da3b438907',
		id: '7249285091378090017'
	}
];

var block2;
var transactionsBlock2 = [
	{
		type: 0,
		amount: 100000000,
		fee: 10000000,
		timestamp: 33772862,
		recipientId: '16313739661670634666L',
		senderId: '2737453412992791987L',
		senderPublicKey: 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		signature: 'd2b2cb8d09169bf9f22ef123361036ae096ad71155fc3afddc7f22d4118b56a949fb82ff12fd6e6a05f411fe7e9e7877f71989959f895a6de94c193fe078f80b',
		id: '15250193673472372402'
	}
];

var block3;
function createBlock (blocksModule, blockLogic, secret, timestamp, transactions, previousBlock) {
	var keypair = blockLogic.scope.ed.makeKeypair(crypto.createHash('sha256').update(secret, 'utf8').digest());
	blocksModule.lastBlock.set(previousBlock);
	var newBlock = blockLogic.create({
		keypair: keypair,
		timestamp: timestamp,
		previousBlock: blocksModule.lastBlock.get(),
		transactions: transactions
	});
	// newBlock.id = blockLogic.getId(newBlock);
	return newBlock;
}

function getValidKeypairForSlot (library, slot) {
	var generateDelegateListPromisified = Promise.promisify(library.modules.delegates.generateDelegateList);
	var lastBlock = genesisBlock;

	return generateDelegateListPromisified(lastBlock.height, null).then(function (list) {
		var delegatePublicKey = list[slot % slots.delegates];
		var secret = _.find(genesisDelegates, function (delegate) {
			return delegate.publicKey === delegatePublicKey;
		}).secret;
		return secret;
	}).catch(function (err) {
		throw err;
	});
}

describe('blocks/verify', function () {

	var library;
	var accounts;
	var blocksVerify;
	var blocks;
	var blockLogic;
	var delegates;
	var db;
	var results;

	before(function (done) {
		application.init({
			sandbox: {
				name: 'lisk_test_blocks_verify'
			}
		}, function (err, scope) {
			scope.modules.blocks.verify.onBind(scope.modules);
			scope.modules.delegates.onBind(scope.modules);
			scope.modules.transactions.onBind(scope.modules);
			scope.modules.blocks.chain.onBind(scope.modules);
			scope.modules.transport.onBind(scope.modules);
			scope.modules.accounts.onBind(scope.modules);
			accounts = scope.modules.accounts;
			blocksVerify = scope.modules.blocks.verify;
			blockLogic = scope.logic.block;
			blocks = scope.modules.blocks;
			delegates = scope.modules.delegates;
			db = scope.db;

			library = scope;
			library.modules.blocks.lastBlock.set(genesisBlock);
			// Bus gets overwritten - waiting for mem_accounts has to be done manually
			setTimeout(done, 5000);
		});
	});

	afterEach(function () {
		library.modules.blocks.lastBlock.set(genesisBlock);
		return db.none('DELETE FROM blocks WHERE height > 1');
	});

	beforeEach(function () {
		results = {
			verified: true,
			errors: []
		};
	});

	after(function (done) {
		application.cleanup(done);
	});

	describe('__private', function () {

		var privateFunctions;

		before(function () {
			var RewiredVerify = rewire('../../../../modules/blocks/verify.js');
			var verify = new RewiredVerify(library.logger, library.logic.block, library.logic.transaction, library.db);
			verify.onBind(library.modules);
			privateFunctions = RewiredVerify.__get__('__private');
		});

		beforeEach(function () {
			results = {
				verified: true,
				errors: []
			};
		});

		describe('verifySignature', function () {

			it('should fail when blockSignature property is not a hex string', function () {
				var blockSignature = validBlock.blockSignature;
				validBlock.blockSignature = 'invalidBlockSignature';

				var result = privateFunctions.verifySignature(validBlock, results);

				expect(result.errors).to.be.an('array').with.lengthOf(2);

				expect(result.errors[0]).to.equal('TypeError: Invalid hex string');
				expect(result.errors[1]).to.equal('Failed to verify block signature');

				validBlock.blockSignature = blockSignature;
			});

			it('should fail when blockSignature property is an invalid hex string', function () {
				var blockSignature = validBlock.blockSignature;
				validBlock.blockSignature = 'bfaaabdc8612e177f1337d225a8a5af18cf2534f9e41b66c114850aa50ca2ea2621c4b2d34c4a8b62ea7d043e854c8ae3891113543f84f437e9d3c9cb24c0e05';

				var result = privateFunctions.verifySignature(validBlock, results);

				expect(result.errors).to.be.an('array').with.lengthOf(1);
				expect(result.errors[0]).to.equal('Failed to verify block signature');

				validBlock.blockSignature = blockSignature;
			});

			it('should fail when generatorPublicKey property is not a hex string', function () {
				var generatorPublicKey = validBlock.generatorPublicKey;
				validBlock.generatorPublicKey = 'invalidBlockSignature';

				var result = privateFunctions.verifySignature(validBlock, results);

				expect(result.errors).to.be.an('array').with.lengthOf(2);
				expect(result.errors[0]).to.equal('TypeError: Invalid hex string');
				expect(result.errors[1]).to.equal('Failed to verify block signature');

				validBlock.generatorPublicKey = generatorPublicKey;
			});

			it('should fail when generatorPublicKey property is an invalid hex string', function () {
				var generatorPublicKey = validBlock.generatorPublicKey;
				validBlock.generatorPublicKey = '948b8b509579306694c00db2206ddb1517bfeca2b0dc833ec1c0f81e9644871b';

				var result = privateFunctions.verifySignature(validBlock, results);

				expect(result.errors).to.be.an('array').with.lengthOf(1);
				expect(result.errors[0]).to.equal('Failed to verify block signature');

				validBlock.generatorPublicKey = generatorPublicKey;
			});
		});

		describe('verifyPreviousBlock', function () {

			it('should fail when previousBlock property is missing', function () {
				var previousBlock = validBlock.previousBlock;
				delete validBlock.previousBlock;

				var result = privateFunctions.verifyPreviousBlock(validBlock, results);

				expect(result.errors).to.be.an('array').with.lengthOf(1);
				expect(result.errors[0]).to.equal('Invalid previous block');

				validBlock.previousBlock = previousBlock;
			});
		});

		describe('verifyVersion', function () {

			it('should fail when block version != 0', function () {
				var version = validBlock.version;
				validBlock.version = 1;

				var result = privateFunctions.verifyVersion(validBlock, results);

				expect(result.errors).to.be.an('array').with.lengthOf(1);
				expect(result.errors[0]).to.equal('Invalid block version');

				validBlock.version = version;
			});
		});

		describe('verifyReward', function () {

			it('should fail when block reward is invalid', function () {
				validBlock.reward = 99;

				var result = privateFunctions.verifyReward(validBlock, results);

				expect(result.errors).to.be.an('array').with.lengthOf(1);
				expect(result.errors[0]).to.equal(['Invalid block reward:', 99, 'expected:', 0].join(' '));

				validBlock.reward = 0;
			});
		});

		describe('verifyId', function () {

			it('should reset block id when block id is an invalid alpha-numeric string value', function () {
				var blockId = '884740302254229983';
				validBlock.id = 'invalid-block-id';

				var result = privateFunctions.verifyId(validBlock, results);

				expect(validBlock.id).to.equal(blockId);
				expect(validBlock.id).to.not.equal('invalid-block-id');
			});

			it('should reset block id when block id is an invalid numeric string value', function () {
				var blockId = '884740302254229983';
				validBlock.id = '11850828211026019526';

				var result = privateFunctions.verifyId(validBlock, results);

				expect(validBlock.id).to.equal(blockId);
				expect(validBlock.id).to.not.equal('11850828211026019526');
			});

			it('should reset block id when block id is an invalid integer value', function () {
				var blockId = '884740302254229983';
				validBlock.id = 11850828211026019526;

				var result = privateFunctions.verifyId(validBlock, results);

				expect(validBlock.id).to.equal(blockId);
				expect(validBlock.id).to.not.equal(11850828211026019526);
			});

			it('should reset block id when block id is a valid integer value', function () {
				var blockId = '884740302254229983';
				validBlock.id = 11850828211026019525;

				var result = privateFunctions.verifyId(validBlock, results);

				expect(validBlock.id).to.equal(blockId);
				expect(validBlock.id).to.not.equal(11850828211026019525);
			});
		});

		describe('verifyPayload', function () {

			it('should fail when payload length greater than maxPayloadLength constant value', function () {
				var payloadLength = validBlock.payloadLength;
				validBlock.payloadLength = 1024 * 1024 * 2;

				var result = privateFunctions.verifyPayload(validBlock, results);

				expect(result.errors).to.be.an('array').with.lengthOf(1);
				expect(result.errors[0]).to.equal('Payload length is too long');

				validBlock.payloadLength = payloadLength;
			});

			it('should fail when transactions length is not equal to numberOfTransactions property', function () {
				validBlock.numberOfTransactions = validBlock.transactions.length + 1;

				var result = privateFunctions.verifyPayload(validBlock, results);

				expect(result.errors).to.be.an('array').with.lengthOf(1);
				expect(result.errors[0]).to.equal('Included transactions do not match block transactions count');

				validBlock.numberOfTransactions = validBlock.transactions.length;
			});

			it('should fail when transactions length greater than maxTxsPerBlock constant value', function () {
				var transactions = validBlock.transactions;
				validBlock.transactions = new Array(26);
				validBlock.numberOfTransactions = validBlock.transactions.length;

				var result = privateFunctions.verifyPayload(validBlock, results);

				expect(result.errors).to.be.an('array').with.lengthOf(3);
				expect(result.errors[0]).to.equal('Number of transactions exceeds maximum per block');
				expect(result.errors[1]).to.equal('Invalid payload hash');
				expect(result.errors[2]).to.equal('Invalid total amount');

				validBlock.transactions = transactions;
				validBlock.numberOfTransactions = transactions.length;
			});

			it('should fail when a transaction is of an unknown type', function () {
				var transactionType = validBlock.transactions[0].type;
				validBlock.transactions[0].type = 555;

				var result = privateFunctions.verifyPayload(validBlock, results);

				expect(result.errors).to.be.an('array').with.lengthOf(2);
				expect(result.errors[0]).to.equal('Unknown transaction type ' + validBlock.transactions[0].type);
				expect(result.errors[1]).to.equal('Invalid payload hash');

				validBlock.transactions[0].type = transactionType;
			});

			it('should fail when a transaction is duplicated', function () {
				var secondTransaction = validBlock.transactions[1];
				validBlock.transactions[1] = validBlock.transactions[0];

				var result = privateFunctions.verifyPayload(validBlock, results);

				expect(result.errors).to.be.an('array').with.lengthOf(3);
				expect(result.errors[0]).to.equal('Encountered duplicate transaction: ' + validBlock.transactions[1].id);
				expect(result.errors[1]).to.equal('Invalid payload hash');
				expect(result.errors[2]).to.equal('Invalid total amount');

				validBlock.transactions[1] = secondTransaction;
			});

			it('should fail when payload hash is invalid', function () {
				var payloadHash = validBlock.payloadHash;
				validBlock.payloadHash = 'invalidPayloadHash';

				var result = privateFunctions.verifyPayload(validBlock, results);

				expect(result.errors).to.be.an('array').with.lengthOf(1);
				expect(result.errors[0]).to.equal('Invalid payload hash');

				validBlock.payloadHash = payloadHash;
			});

			it('should fail when summed transaction amounts do not match totalAmount property', function () {
				var totalAmount = validBlock.totalAmount;
				validBlock.totalAmount = 99;

				var result = privateFunctions.verifyPayload(validBlock, results);

				expect(result.errors).to.be.an('array').with.lengthOf(1);
				expect(result.errors[0]).to.equal('Invalid total amount');

				validBlock.totalAmount = totalAmount;
			});

			it('should fail when summed transaction fees do not match totalFee property', function () {
				var totalFee = validBlock.totalFee;
				validBlock.totalFee = 99;

				var result = privateFunctions.verifyPayload(validBlock, results);

				expect(result.errors).to.be.an('array').with.lengthOf(1);
				expect(result.errors[0]).to.equal('Invalid total fee');

				validBlock.totalFee = totalFee;
			});
		});

		describe('verifyForkOne', function () {

			it('should fail when previousBlock value is invalid', function () {
				validBlock.previousBlock = '10937893559311260102';

				var result = privateFunctions.verifyForkOne(validBlock, previousBlock, results);

				expect(result.errors).to.be.an('array').with.lengthOf(1);
				expect(result.errors[0]).to.equal(['Invalid previous block:', validBlock.previousBlock, 'expected:', previousBlock.id].join(' '));

				validBlock.previousBlock = previousBlock;
			});
		});

		describe('verifyBlockSlot', function () {

			it('should fail when block timestamp is less than previousBlock timestamp', function () {
				var timestamp = validBlock.timestamp;
				validBlock.timestamp = 32578350;

				var result = privateFunctions.verifyBlockSlot(validBlock, previousBlock, results);

				expect(result.errors).to.be.an('array').with.lengthOf(1);
				expect(result.errors[0]).to.equal('Invalid block timestamp');

				validBlock.timestamp  = timestamp;
			});
		});
	});

	// TODO: Refactor this test, dataset being used is no longer valid because of blockSlotWindow check
	describe('verifyReceipt() when block is valid', function () {});

	describe('verifyBlock() when block is valid', function () {});

	describe('addBlockProperties()', function () {

		it('should be ok');
	});

	describe('deleteBlockProperties()', function () {

		it('should be ok');
	});

	// Sends a block to network, save it locally
	describe('processBlock() for valid block {broadcast: true, saveBlock: true}', function () {

		it('should clear database', function (done) {
			async.every([
				'blocks where height > 1',
				'trs where "blockId" != \'6524861224470851795\'',
				'mem_accounts where address in (\'2737453412992791987L\', \'2896019180726908125L\')',
				'forks_stat',
				'votes where "transactionId" = \'17502993173215211070\''
			], function (table, seriesCb) {
				clearDatabaseTable(db, modulesLoader.logger, table, seriesCb);
			}, function (err, result) {
				if (err) {
					return done(err);
				}
				delegates.generateDelegateList(1, null, done);
			});
		});

		it('should generate account', function (done) {
			accounts.setAccountAndGet(testAccount.account, function (err, newaccount) {
				if (err) {
					return done(err);
				}
				expect(newaccount.address).to.equal(testAccount.account.address);
				done();
			});
		});

		it('should generate block 1', function (done) {
			var slot = slots.getSlotNumber();
			var time = slots.getSlotTime(slots.getSlotNumber());

			getValidKeypairForSlot(library, slot).then(function (secret) {
				block1 = createBlock(blocks, blockLogic, secret, time, [], genesisBlock);
				expect(block1.version).to.equal(0);
				expect(block1.timestamp).to.equal(time);
				expect(block1.numberOfTransactions).to.equal(0);
				expect(block1.reward).to.equal(0);
				expect(block1.totalFee).to.equal(0);
				expect(block1.totalAmount).to.equal(0);
				expect(block1.payloadLength).to.equal(0);
				expect(block1.transactions).to.deep.eql([]);
				expect(block1.previousBlock).to.equal(genesisBlock.id);
				done();
			});
		});

		it('should be ok when processing block 1', function (done) {
			blocksVerify.processBlock(block1, true, true, function (err, result) {
				if (err) {
					return done(err);
				}
				expect(result).to.be.undefined;
				done();
			});
		});
	});

	describe('processBlock() for invalid block {broadcast: true, saveBlock: true}', function () {

		beforeEach(function (done) {
			blocksVerify.processBlock(block1, true, true, done);
		});

		it('should fail when processing block 1 multiple times', function (done) {
			blocksVerify.processBlock(block1, true, true, function (err, result) {
				expect(err).to.equal('Invalid block timestamp');
				done();
			});
		});
	});

	// Receives a block from network, save it locally.
	describe('processBlock() for invalid block {broadcast: false, saveBlock: true}', function () {

		var invalidBlock2;

		it('should generate block 2 with invalid generator slot', function (done) {
			var secret = 'latin swamp simple bridge pilot become topic summer budget dentist hollow seed';

			invalidBlock2 = createBlock(blocks, blockLogic, secret, 33772882, [], genesisBlock);
			expect(invalidBlock2.version).to.equal(0);
			expect(invalidBlock2.timestamp).to.equal(33772882);
			expect(invalidBlock2.numberOfTransactions).to.equal(0);
			expect(invalidBlock2.reward).to.equal(0);
			expect(invalidBlock2.totalFee).to.equal(0);
			expect(invalidBlock2.totalAmount).to.equal(0);
			expect(invalidBlock2.payloadLength).to.equal(0);
			expect(invalidBlock2.transactions).to.deep.eql([]);
			expect(invalidBlock2.previousBlock).to.equal(genesisBlock.id);
			done();
		});

		describe('normalizeBlock validations', function () {

			before(function () {
				block2 = createBlock(blocks, blockLogic, random.password(), 33772882, [genesisBlock.transactions[0]], genesisBlock);
			});

			it('should fail when timestamp property is missing', function (done) {
				block2 = blocksVerify.deleteBlockProperties(block2);
				var timestamp = block2.timestamp;
				delete block2.timestamp;

				blocksVerify.processBlock(block2, false, true, function (err, result) {
					if (err) {
						expect(err).equal('Failed to validate block schema: Missing required property: timestamp');
						block2.timestamp = timestamp;
						done();
					}
				});
			});

			it('should fail when transactions property is missing', function (done) {
				var transactions = block2.transactions;
				delete block2.transactions;

				blocksVerify.processBlock(block2, false, true, function (err, result) {
					if (err) {
						expect(err).equal('Invalid total amount');
						block2.transactions = transactions;
						done();
					}
				});
			});

			it('should fail when transaction type property is missing', function (done) {
				var transactionType = block2.transactions[0].type;
				delete block2.transactions[0].type;

				blocksVerify.processBlock(block2, false, true, function (err, result) {
					if (err) {
						expect(err).equal('Unknown transaction type undefined');
						block2.transactions[0].type = transactionType;
						done();
					}
				});
			});

			it('should fail when transaction timestamp property is missing', function (done) {
				var transactionTimestamp = block2.transactions[0].timestamp;
				delete block2.transactions[0].timestamp;

				blocksVerify.processBlock(block2, false, true, function (err, result) {
					if (err) {
						expect(err).equal('Failed to validate transaction schema: Missing required property: timestamp');
						block2.transactions[0].timestamp = transactionTimestamp;
						done();
					}
				});
			});

			it('should fail when block generator is invalid (fork:3)', function (done) {
				blocksVerify.processBlock(block2, false, true, function (err, result) {
					if (err) {
						expect(err).equal('Failed to verify slot: 3377288');
						done();
					}
				});
			});

			describe('block with processed transaction', function () {

				var block2;

				it('should generate block 1 with valid generator slot and processed transaction', function (done) {
					var slot = slots.getSlotNumber();
					var time = slots.getSlotTime(slots.getSlotNumber());

					getValidKeypairForSlot(library, slot).then(function (secret) {
						block2 = createBlock(blocks, blockLogic, secret, time, [genesisBlock.transactions[0]], genesisBlock);

						expect(block2.version).to.equal(0);
						expect(block2.timestamp).to.equal(time);
						expect(block2.numberOfTransactions).to.equal(1);
						expect(block2.reward).to.equal(0);
						expect(block2.totalFee).to.equal(0);
						expect(block2.totalAmount).to.equal(10000000000000000);
						expect(block2.payloadLength).to.equal(117);
						expect(block2.transactions).to.deep.eql([genesisBlock.transactions[0]]);
						expect(block2.previousBlock).to.equal(genesisBlock.id);
						done();
					});
				});

				it('should fail when transaction is already confirmed (fork:2)', function (done) {
					block2 = blocksVerify.deleteBlockProperties(block2);

					blocksVerify.processBlock(block2, false, true, function (err, result) {
						if (err) {
							expect(err).to.equal(['Transaction is already confirmed:', genesisBlock.transactions[0].id].join(' '));
							done();
						}
					});
				});
			});
		});
	});

	describe('processBlock() for valid block {broadcast: false, saveBlock: true}', function () {

		it('should generate block 2 with valid generator slot', function (done) {
			var slot = slots.getSlotNumber();
			var time = slots.getSlotTime(slots.getSlotNumber());

			getValidKeypairForSlot(library, slot).then(function (secret) {
				block2 = createBlock(blocks, blockLogic, secret, time, [], genesisBlock);
				expect(block2.version).to.equal(0);
				expect(block2.timestamp).to.equal(time);
				expect(block2.numberOfTransactions).to.equal(0);
				expect(block2.reward).to.equal(0);
				expect(block2.totalFee).to.equal(0);
				expect(block2.totalAmount).to.equal(0);
				expect(block2.payloadLength).to.equal(0);
				expect(block2.transactions).to.deep.equal([]);
				expect(block2.previousBlock).to.equal(genesisBlock.id);
				done();
			});
		});

		it('should be ok when processing block 2', function (done) {
			blocksVerify.processBlock(block2, false, true, function (err, result) {
				if (err) {
					return done(err);
				}
				expect(result).to.be.undefined;
				done();
			});
		});
	});

	describe('__private', function () {

		var blockVerify;

		before(function () {
			blockVerify = rewire('../../../../modules/blocks/verify.js');
		});

		describe('verifyBlockSlotWindow', function () {

			var verifyBlockSlotWindow;
			var result;

			before(function () {
				verifyBlockSlotWindow = blockVerify.__get__('__private.verifyBlockSlotWindow');
			});

			beforeEach(function () {
				result = {
					errors: []
				};
			});

			describe('for current slot number', function () {

				var dummyBlock;

				before(function () {
					dummyBlock = {
						timestamp: slots.getSlotTime(slots.getSlotNumber())
					};
				});

				it('should return empty result.errors array', function () {
					expect(verifyBlockSlotWindow(dummyBlock, result).errors).to.have.length(0);
				});
			});

			describe('for slot number ' + constants.blockSlotWindow + ' slots in the past', function () {

				var dummyBlock;

				before(function () {
					dummyBlock = {
						timestamp: slots.getSlotTime(slots.getSlotNumber() - constants.blockSlotWindow)
					};
				});

				it('should return empty result.errors array', function () {
					expect(verifyBlockSlotWindow(dummyBlock, result).errors).to.have.length(0);
				});
			});

			describe('for slot number in the future', function () {

				var dummyBlock;

				before(function () {
					dummyBlock = {
						timestamp: slots.getSlotTime(slots.getSlotNumber() + 1)
					};
				});

				it('should call callback with error = Block slot is in the future ', function () {
					expect(verifyBlockSlotWindow(dummyBlock, result).errors).to.include.members(['Block slot is in the future']);
				});
			});

			describe('for slot number ' + (constants.blockSlotWindow + 1) + ' slots in the past', function () {

				var dummyBlock;

				before(function () {
					dummyBlock = {
						timestamp: slots.getSlotTime(slots.getSlotNumber() - (constants.blockSlotWindow + 1))
					};
				});

				it('should call callback with error = Block slot is too old', function () {
					expect(verifyBlockSlotWindow(dummyBlock, result).errors).to.include.members(['Block slot is too old']);
				});
			});
		});

		describe('onBlockchainReady', function () {

			var onBlockchainReady;

			before(function () {
				blockVerify.__set__('library', {
					db: db,
					logger: library.logger
				});
				onBlockchainReady = blockVerify.prototype.onBlockchainReady;
			});

			it('should set the __private.lastNBlockIds variable', function () {
				return onBlockchainReady().then(function () {
					var lastNBlockIds = blockVerify.__get__('__private.lastNBlockIds');
					expect(lastNBlockIds).to.be.an('array').and.to.have.length.below(constants.blockSlotWindow + 1);
					_.each(lastNBlockIds, function (value) {
						expect(value).to.be.a('string');
					});
				});
			});
		});

		describe('onNewBlock', function () {

			describe('with lastNBlockIds', function () {

				var lastNBlockIds;

				before(function () {
					lastNBlockIds = blockVerify.__get__('__private.lastNBlockIds');
				});

				describe('when onNewBlock function is called once', function () {

					var dummyBlock;

					before(function () {
						dummyBlock = {
							id: '123123123'
						};

						blockVerify.prototype.onNewBlock(dummyBlock);
					});

					it('should include block in lastNBlockIds queue', function () {
						expect(lastNBlockIds).to.include.members([dummyBlock.id]);
					});
				});

				describe('when onNewBlock function is called ' + constants.blockSlotWindow + 'times', function () {

					var blockIds = [];

					before(function () {
						_.map(_.range(0, constants.blockSlotWindow), function () {
							var randomId = Math.floor(Math.random() * 100000000000).toString();
							blockIds.push(randomId);
							var dummyBlock = {
								id: randomId
							};

							blockVerify.prototype.onNewBlock(dummyBlock);
						});
					});

					it('should include blockId in lastNBlockIds queue', function () {
						expect(lastNBlockIds).to.include.members(blockIds);
					});
				});

				describe('when onNewBlock function is called ' + (constants.blockSlotWindow * 2) + ' times', function () {

					var recentNBlockIds;
					var olderThanNBlockIds;

					before(function () {
						var blockIds = [];
						_.map(_.range(0, constants.blockSlotWindow * 2), function () {
							var randomId = Math.floor(Math.random() * 100000000000).toString();
							blockIds.push(randomId);
							var dummyBlock = {
								id: randomId
							};

							blockVerify.prototype.onNewBlock(dummyBlock);
						});

						recentNBlockIds = blockIds.filter(function (value, index) {
							return blockIds.length - 1 - index < constants.blockSlotWindow;
						});

						olderThanNBlockIds = blockIds.filter(function (value, index) {
							return blockIds.length - 1 - index >= constants.blockSlotWindow;
						});
					});

					it('should maintain last ' + constants.blockSlotWindow + ' blockIds in lastNBlockIds queue', function () {
						expect(lastNBlockIds).to.include.members(recentNBlockIds);
						expect(lastNBlockIds).to.not.include.members(olderThanNBlockIds);
					});
				});
			});
		});

		describe('verifyAgainstLastNBlockIds', function () {

			var verifyAgainstLastNBlockIds;
			var result = {
				verified: true,
				errors: []
			};

			before(function () {
				verifyAgainstLastNBlockIds = blockVerify.__get__('__private.verifyAgainstLastNBlockIds');
			});

			afterEach(function () {
				result = {
					verified: true,
					errors: []
				};
			});

			describe('when __private.lastNBlockIds', function () {

				var lastNBlockIds;

				before(function () {
					lastNBlockIds = blockVerify.__get__('__private.lastNBlockIds');
				});

				describe('contains block id', function () {

					var dummyBlockId = '123123123123';

					before(function () {
						lastNBlockIds.push(dummyBlockId);
					});

					it('should return result with error = Block already exists in chain', function () {
						expect(verifyAgainstLastNBlockIds({id: dummyBlockId}, result).errors).to.include.members(['Block already exists in chain']);
					});
				});

				describe('does not contain block id', function () {

					it('should return result with no errors', function () {
						expect(verifyAgainstLastNBlockIds({id: '1231231234'}, result).errors).to.have.length(0);
					});
				});
			});
		});
	});
});
