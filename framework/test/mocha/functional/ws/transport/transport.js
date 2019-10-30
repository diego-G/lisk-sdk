/*
 * Copyright © 2019 Lisk Foundation
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

require('../../functional');
const { P2P } = require('@liskhq/lisk-p2p');
const { generatePeerHeader } = require('../../../common/generatePeerHeader');
const waitFor = require('../../../common/utils/wait_for');
const SwaggerEndpoint = require('../../../common/swagger_spec');

describe('WS transport', () => {
	let p2p;

	before('establish client WS connection to server', async () => {
		// Setup stub for blocks endpoints
		p2p = new P2P(generatePeerHeader());
		await p2p.start();

		await waitFor.blocksPromise(1, null);
	});

	after(async () => {
		await p2p.stop();
	});

	const testBlock = {
		id: '2807833455815592401',
		version: 0,
		timestamp: 39997040,
		height: 1258,
		previousBlock: '3863141986505461614',
		numberOfTransactions: 0,
		transactions: [],
		totalAmount: 0,
		totalFee: 0,
		reward: 0,
		payloadLength: 0,
		payloadHash:
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		generatorPublicKey:
			'bf9f5cfc548d29983cc0dfa5c4ec47c66c31df0f87aa669869678996902ab47f',
		generatorId: '9950029393097476480L',
		blockSignature:
			'd54ac91d2f712f408e16ff5057f7ceaa2e3a1ad4bde759e1025b16ec48bdd8ea1d3adaf5e8b94ef205f9f365f6ebae0f178a3cb3f6354c28e74ba7a05fce600c',
		confirmations: 2,
		totalForged: '0',
	};

	describe('getBlocksFromId', () => {
		it('should return height', async () => {
			const blocksEndpoint = new SwaggerEndpoint('GET /blocks');
			const blockRes = await blocksEndpoint.makeRequest({ height: 2 }, 200);
			const blockId = blockRes.body.data[0].id;
			const { data } = await p2p.request({
				procedure: 'getBlocksFromId',
				data: { blockId },
			});
			expect(data).to.be.an('array');
		});

		it('should be ok to use a valid payload', async () => {
			const blocksEndpoint = new SwaggerEndpoint('GET /blocks');

			const blockRes = await blocksEndpoint.makeRequest({ height: 2 }, 200);
			const blockId = blockRes.body.data[0].id;
			const { data } = await p2p.request({
				procedure: 'getBlocksFromId',
				data: { blockId },
			});
			expect(data).that.is.an('array');
			for (const block of data) {
				expect(block)
					.to.have.property('id')
					.that.is.a('string');
				expect(block)
					.to.have.property('version')
					.that.is.a('number');
				expect(block)
					.to.have.property('timestamp')
					.that.is.a('number');
				expect(block)
					.to.have.property('height')
					.that.is.a('number');
				expect(block).to.have.property('previousBlock');
				expect(block)
					.to.have.property('numberOfTransactions')
					.that.is.a('number');
				expect(block)
					.to.have.property('totalAmount')
					.that.is.a('string');
				expect(block)
					.to.have.property('totalFee')
					.that.is.a('string');
				expect(block)
					.to.have.property('reward')
					.that.is.a('string');
				expect(block)
					.to.have.property('payloadLength')
					.that.is.a('number');
				expect(block)
					.to.have.property('payloadHash')
					.that.is.a('string');
				expect(block)
					.to.have.property('generatorPublicKey')
					.that.is.a('string');
				expect(block)
					.to.have.property('blockSignature')
					.that.is.a('string');
				expect(block)
					.to.have.property('transactions')
					.that.is.an('array');
			}
		});

		it('should fail when using an empty payload', async () => {
			try {
				await p2p.request({
					procedure: 'getBlocksFromId',
					data: {},
				});
			} catch (e) {
				expect(e[0].message).to.equal(
					"should have required property 'blockId'",
				);
			}
		});

		it('should fail when using an invalid block ID format', async () => {
			try {
				await p2p.request({
					procedure: 'getBlocksFromId',
					data: { blockId: 'abcd1234' },
				});
			} catch (e) {
				expect(e[0].message).to.equal('should match format "id"');
			}
		});

		it("should throw an error when payload doesn't have the correct format", async () => {
			try {
				await p2p.request({
					procedure: 'getBlocksFromId',
					data: { unwantedProperty: 1 },
				});
			} catch (e) {
				expect(e[0].message).to.equal(
					"should have required property 'blockId'",
				);
			}
		});
	});

	describe('getTransactions', () => {
		it('should return object containing an array of transactions', async () => {
			const { data } = await p2p.request({
				procedure: 'getTransactions',
				data: ['id1', 'id2'],
			});
			expect(data).to.have.property('success', true);
			expect(data).to.have.property('transactions');
			expect(data.transactions).to.be.an.empty('array');
		});
	});

	describe('getHighestCommonBlock', () => {
		it('using no params should fail', async () => {
			let res;
			try {
				const { data } = await p2p.request({
					procedure: 'getHighestCommonBlock',
				});
				res = data;
			} catch (err) {
				__testContext.debug(
					'> Error / Response:'.grey,
					JSON.stringify(err.response),
					JSON.stringify(res),
				);
				expect(err.message).to.equal('should be object: undefined');
				expect(res).to.be.undefined;
			}
		});

		it('using non unique ids should fail', async () => {
			let res;
			try {
				res = await p2p.request({
					procedure: 'getHighestCommonBlock',
					data: { ids: ['1', '2', '2'] },
				});
			} catch (err) {
				__testContext.debug(
					'> Error / Response:'.grey,
					JSON.stringify(err.response),
					JSON.stringify(res),
				);
				expect(err.message).to.equal(
					'should NOT have duplicate items (items ## 2 and 1 are identical): undefined',
				);
			}
		});

		it('using an empty array should fail', async () => {
			let res;
			try {
				res = await p2p.request({
					procedure: 'getHighestCommonBlock',
					data: { ids: [] },
				});
			} catch (err) {
				__testContext.debug(
					'> Error / Response:'.grey,
					JSON.stringify(err.response),
					JSON.stringify(res),
				);
				expect(err.message).to.equal(
					'should NOT have fewer than 1 items: undefined',
				);
			}
		});

		it('should fail when using invalid id format', async () => {
			let res;
			try {
				res = await p2p.request({
					procedure: 'getHighestCommonBlock',
					data: { ids: ['abcde', '1'] },
				});
			} catch (err) {
				__testContext.debug(
					'> Error / Response:'.grey,
					JSON.stringify(err.response),
					JSON.stringify(res),
				);
				expect(err.message).to.equal('should match format "id": undefined');
			}
		});

		it('not using an array should fail', async () => {
			let res;
			try {
				res = await p2p.request({
					procedure: 'getHighestCommonBlock',
					data: { ids: '1,2,3,4,5,6' },
				});
			} catch (err) {
				__testContext.debug(
					'> Error / Response:'.grey,
					JSON.stringify(err.response),
					JSON.stringify(res),
				);
				expect(err.message).to.equal('should be array: undefined');
			}
		});

		it('using ["1","2","3"] should return an empty array (no common blocks)', async () => {
			const { data } = await p2p.request({
				procedure: 'getHighestCommonBlock',
				data: {
					ids: ['1', '2', '3'],
				},
			});
			__testContext.debug('> Error / Response:'.grey, JSON.stringify(data));
			expect(data).to.be.undefined;
		});
	});

	describe('postBlock', () => {
		it('should broadcast valid block', async () => {
			testBlock.transactions.forEach(transaction => {
				if (transaction.asset && transaction.asset.delegate) {
					transaction.asset.delegate.publicKey = transaction.senderPublicKey;
				}
			});
			await p2p.send({ event: 'postBlock', data: { block: testBlock } });
		});

		it('should not crash the application when sending the invalid block', async () => {
			await p2p.send({
				event: 'postBlock',
				data: { block: { generatorPublicKey: '123' } },
			});
		});
	});

	describe('postSignatures', () => {
		it('should not crash the application when sending the invalid signatures', async () => {
			await p2p.send({
				event: 'postSignatures',
				data: { signatures: ['not object signature'] },
			});
		});
	});
});
