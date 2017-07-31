'use strict';

var chai = require('chai');
var expect = require('chai').expect;

var express = require('express');
var sinon = require('sinon');

var modulesLoader = require('../../../common/initModule').modulesLoader;
var BlockLogic = require('../../../../logic/block.js');
var exceptions = require('../../../../helpers/exceptions.js');

var previousBlock = {
	blockSignature:'696f78bed4d02faae05224db64e964195c39f715471ebf416b260bc01fa0148f3bddf559127b2725c222b01cededb37c7652293eb1a81affe2acdc570266b501',
	generatorPublicKey:'86499879448d1b0215d59cbf078836e3d7d9d2782d56a2274a568761bff36f19',
	height:488,
	id:'11850828211026019525',
	numberOfTransactions:0,
	payloadHash:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
	payloadLength:0,
	previousBlock:'8805727971083409014',
	relays:1,
	reward:0,
	timestamp:32578360,
	totalAmount:0,
	totalFee:0,
	transactions: [],
	version:0,
};

var validBlock = {
	blockSignature: '56d63b563e00332ec31451376f5f2665fcf7e118d45e68f8db0b00db5963b56bc6776a42d520978c1522c39545c9aff62a7d5bdcf851bf65904b2c2158870f00',
	generatorPublicKey: '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
	numberOfTransactions: 2,
	payloadHash: 'be0df321b1653c203226add63ac0d13b3411c2f4caf0a213566cbd39edb7ce3b',
	payloadLength: 494,
	previousBlock: '11850828211026019525',
	reward: 0,
	timestamp: 32578370,
	totalAmount: 10000000000000000,
	totalFee: 0,
	transactions: [
		{
			'type': 0,
			'amount': 10000000000000000,
			'fee': 0,
			'timestamp': 0,
			'recipientId': '16313739661670634666L',
			'senderId': '1085993630748340485L',
			'senderPublicKey': 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
			'signature': 'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05',
			'id': '1465651642158264047'
		},
		{
			'type': 3,
			'amount': 0,
			'fee': 0,
			'timestamp': 0,
			'recipientId': '16313739661670634666L',
			'senderId': '16313739661670634666L',
			'senderPublicKey': 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
			'asset': {
				'votes': [
					'+9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					'+141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
					'-3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
					'-5d28e992b80172f38d3a2f9592cad740fd18d3c2e187745cd5f7badf285ed819'
				]
			},
			'signature': '9f9446b527e93f81d3fb8840b02fcd1454e2b6276d3c19bd724033a01d3121dd2edb0aff61d48fad29091e222249754e8ec541132032aefaeebc312796f69e08',
			'id': '9314232245035524467'
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
	timestamp: 32578370,
	totalAmount: 10000000000000000,
	totalFee: 0,
	transactions: [
		{
			'type': 0,
			'amount': 10000000000000000,
			'fee': 0,
			'timestamp': 0,
			'recipientId': '16313739661670634666L',
			'senderId': '1085993630748340485L',
			'senderPublicKey': 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
			'signature': 'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05',
			'id': '1465651642158264047'
		},
		{
			'type': 3,
			'amount': 0,
			'fee': 0,
			'timestamp': 0,
			'recipientId': '16313739661670634666L',
			'senderId': '16313739661670634666L',
			'senderPublicKey': 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
			'asset': {
				'votes': [
					'+9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					'+141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
					'-3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
					'-5d28e992b80172f38d3a2f9592cad740fd18d3c2e187745cd5f7badf285ed819'
				]
			},
			'signature': '9f9446b527e93f81d3fb8840b02fcd1454e2b6276d3c19bd724033a01d3121dd2edb0aff61d48fad29091e222249754e8ec541132032aefaeebc312796f69e08',
			'id': '9314232245035524467'
		}
	],
	version: 0,
	id: '15635779876149546284'
};

describe('blocks/verify', function () {

	var blocksVerify;
	var blocks;
	var blockLogic;

	before(function (done) {
		modulesLoader.initLogic(BlockLogic, modulesLoader.scope, function (err, __blockLogic) {
			if (err) {
				return done(err);
			}			
			blockLogic = __blockLogic;

			modulesLoader.initModules([
				{blocks: require('../../../../modules/blocks')},
				{accounts: require('../../../../modules/accounts')},
				{delegates: require('../../../../modules/delegates')},
				{transactions: require('../../../../modules/transactions')},
			], [
				{'block': require('../../../../logic/block')},
				{'transaction': require('../../../../logic/transaction')},
			], {}, function (err, __blocks) {
				if (err) {
					return done(err);
				}
				__blocks.blocks.verify.onBind(__blocks);
				blocks = __blocks.blocks;
				blocksVerify = __blocks.blocks.verify;
				done();
			});
		});
	});

	describe('verifyBlock() for valid block', function () {

		it('should be ok', function (done) {
			blocks.lastBlock.set(previousBlock);
			
			blocksVerify.verifyBlock(validBlock, function (err) {
				expect(err).to.be.null;
				done();
			});
		});
		
		it('should be ok when block is invalid but block id is excepted for having invalid block reward', function (done) {
			exceptions.blockRewards.push(blockRewardInvalid.id);
			
			blocksVerify.verifyBlock(blockRewardInvalid, function (err) {
				expect(err).to.be.null;
				done();
			});
		});
	});

	describe('verifyBlock() for invalid block', function () {
		
		describe('base validations', function () {

			it('should fail when block version != 0', function (done) {
				var version = validBlock.version;
				validBlock.version = 99;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid block version');
					validBlock.version = version;
					done();
				});
			});

			it('should fail when block timestamp is less than previous block timestamp', function (done) {
				var timestamp = validBlock.timestamp;
				validBlock.timestamp = 32578350;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid block timestamp');
					validBlock.timestamp  = timestamp;
					done();
				});
			});
			
			it('should fail when previousBlock property is missing', function (done) {
				var previousBlock = validBlock.previousBlock;
				delete validBlock.previousBlock;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid previous block');
					validBlock.previousBlock = previousBlock;
					done();
				});
			});

			it('should fail when previousBlock value is invalid (fork:1)', function (done) {
				var prevBlock = validBlock.previousBlock;
				validBlock.previousBlock = '10937893559311260102';

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal(['Invalid previous block:', validBlock.previousBlock, 'expected:', previousBlock.id].join(' '));
					validBlock.previousBlock = prevBlock;
					done();
				});
			});

			it('should fail when payload length greater than maxPayloadLength constant value', function (done) {
				var payloadLength = validBlock.payloadLength;
				validBlock.payloadLength = 1024 * 1024 * 2;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Payload length is too long');
					validBlock.payloadLength = payloadLength;
					done();
				});
			});

			it('should fail when transactions length is not equal to numberOfTransactions property', function (done) {
				validBlock.numberOfTransactions = validBlock.transactions.length + 1;
				
				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Included transactions do not match block transactions count');
					validBlock.numberOfTransactions = validBlock.transactions.length;
					done();
				});
			});

			it('should fail when transactions length greater than maxTxsPerBlock constant value', function (done) {
				var transactions = validBlock.transactions;
				validBlock.transactions = new Array(26);
				validBlock.numberOfTransactions = validBlock.transactions.length;
				
				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Number of transactions exceeds maximum per block');
					validBlock.transactions = transactions;
					validBlock.numberOfTransactions = transactions.length;
					done();
				});
			});
		});

		describe('transaction validations', function () {

			it('should fail when a transaction is of an unknown type', function (done) {
				var trsType = validBlock.transactions[0].type;
				validBlock.transactions[0].type = 555;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Unknown transaction type ' + validBlock.transactions[0].type);
					validBlock.transactions[0].type = trsType;
					done();
				});
			});

			it('should fail when a transaction is duplicated', function (done) {
				var secondTrs = validBlock.transactions[1];
				validBlock.transactions[1] = validBlock.transactions[0];

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Encountered duplicate transaction: ' + validBlock.transactions[1].id);
					validBlock.transactions[1] = secondTrs;
					done();
				});
			});

			it('should fail when payload hash is invalid', function (done) {
				var payloadHash = validBlock.payloadHash;
				validBlock.payloadHash = 'invalidpayloadhash';

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid payload hash');
					validBlock.payloadHash = payloadHash;
					done();
				});
			});

			it('should fail when summed transaction amounts do not match totalAmount property', function (done) {
				var totalAmount = validBlock.totalAmount;
				validBlock.totalAmount = 99;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid total amount');
					validBlock.totalAmount = totalAmount;
					done();
				});
			});

			it('should fail when summed transaction fees do not match totalFee property', function (done) {
				var totalFee = validBlock.totalFee;
				validBlock.totalFee = 99;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid total fee');
					validBlock.totalFee = totalFee;
					done();
				});
			});
		});

		describe('signature validations', function () {

			it('should fail when blockSignature property is not a hex string', function (done) {
				var blockSignature = validBlock.blockSignature;
				validBlock.blockSignature = 'invalidblocksignature';

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('TypeError: Invalid hex string');
					validBlock.blockSignature = blockSignature;
					done();
				});
			});

			it('should fail when blockSignature property is an invalid hex string', function (done) {
				var blockSignature = validBlock.blockSignature;
				validBlock.blockSignature = 'bfaaabdc8612e177f1337d225a8a5af18cf2534f9e41b66c114850aa50ca2ea2621c4b2d34c4a8b62ea7d043e854c8ae3891113543f84f437e9d3c9cb24c0e05';

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Failed to verify block signature');
					validBlock.blockSignature = blockSignature;
					done();
				});
			});

			it('should fail when generatorPublicKey property is not a hex string', function (done) {
				var generatorPublicKey = validBlock.generatorPublicKey;
				validBlock.generatorPublicKey = 'invalidblocksignature';

				var check = blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('TypeError: Invalid hex string');
					validBlock.generatorPublicKey = generatorPublicKey;
					done();
				});
			});		

			it('should fail when generatorPublicKey property is an invalid hex string', function (done) {
				var generatorPublicKey = validBlock.generatorPublicKey;
				validBlock.generatorPublicKey = '948b8b509579306694c00db2206ddb1517bfeca2b0dc833ec1c0f81e9644871b';

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Failed to verify block signature');
					validBlock.generatorPublicKey = generatorPublicKey;
					done();
				});
			});
		});
		
		describe('setBlockId validations', function () {

			it('should reset block id when block id is an invalid alpha-numeric string value', function (done) {
				var blockId = validBlock.id;
				validBlock.id = 'invalid-block-id';

				blocksVerify.verifyBlock(validBlock, function (err, result) {
					if (err) {
						return done(err);
					}
					expect(validBlock.id).to.equal(blockId);
					done();
				});
			});

			it('should reset block id when block id is an invalid numeric string value', function (done) {
				var blockId = validBlock.id;
				validBlock.id = '11850828211026019526';

				blocksVerify.verifyBlock(validBlock, function (err, result) {
					if (err) {
						return done(err);
					}
					expect(validBlock.id).to.equal(blockId);
					done();
				});
			});

			it('should reset block id when block id is an invalid integer value', function (done) {
				var blockId = validBlock.id;
				validBlock.id = 11850828211026019526;

				blocksVerify.verifyBlock(validBlock, function (err, result) {
					if (err) {
						return done(err);
					}
					expect(validBlock.id).to.equal(blockId);
					done();
				});
			});

			it('should reset block id when block id is a valid integer value', function (done) {
				var blockId = validBlock.id;
				validBlock.id = 11850828211026019525;

				blocksVerify.verifyBlock(validBlock, function (err, result) {
					if (err) {
						return done(err);
					}
					expect(validBlock.id).to.equal(blockId);
					done();
				});
			});
		});

		describe('blockReward validations', function () {

			it('should fail when block reward is invalid', function (done) {
				exceptions.blockRewards.pop();

				blocksVerify.verifyBlock(blockRewardInvalid, function (err) {
					expect(err).to.equal(['Invalid block reward:', blockRewardInvalid.reward, 'expected:', validBlock.reward].join(' '));
					done();
				});
			});
		});
	});
});
