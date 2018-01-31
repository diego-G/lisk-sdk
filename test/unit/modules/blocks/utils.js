/* eslint-disable mocha/no-pending-tests */
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

var rewire = require('rewire');
var modulesLoader = require('../../../common/modulesLoader');
var BlocksUtils= rewire('../../../../modules/blocks/utils.js');

var viewRow_full_blocks_list = [{
	b_id: '13068833527549895884',
	b_height: 3,
	t_id: '6950874693022090568',
	t_type: 0
}];

describe('blocks/utils', function () {

	var __private;
	var library;
	var blocksUtilsModule;
	var dbStub;
	var loggerStub;
	var blockMock;
	var transactionMock;

	describe('Utils', function () {

		before(function (done) {
			dbStub = {
				blocks: {
					getIdSequence: sinonSandbox.stub().resolves(),
					getHeightByLastId: sinonSandbox.stub().resolves(['1']),
					loadLastBlock: sinonSandbox.stub().resolves(viewRow_full_blocks_list),
					loadBlocksData: sinonSandbox.stub(),
					aggregateBlocksReward: sinonSandbox.stub().resolves()
				}
			};

			dbStub.blocks.loadBlocksData.withArgs(sinonSandbox.match({id:'13068833527549895884'})).resolves(viewRow_full_blocks_list).withArgs(sinonSandbox.match({id:'1'})).resolves([]);

			blockMock = {
				dbRead: function (input) {
					return({id: input.b_id, height: input.b_height});
				}
			};
			transactionMock = {
				dbRead: function (input) {
					return({id: input.t_id, type: input.t_type});
				}
			};

			loggerStub = {
				trace: sinonSandbox.spy(),
				info:  sinonSandbox.spy(),
				error: sinonSandbox.spy()
			};

			blocksUtilsModule =  new BlocksUtils(loggerStub, blockMock, transactionMock, dbStub, modulesLoader.scope.dbSequence, modulesLoader.scope.genesisblock);
			library = BlocksUtils.__get__('library');
			__private = BlocksUtils.__get__('__private');
			done();
		});

		describe('library', function () {

			it('should assign logger', function () {
				expect(library.logger).to.eql(loggerStub);
			});

			it('should assign db', function () {
				expect(library.db).to.eql(dbStub);
			});

			it('should assign dbSequence', function () {
				expect(library.dbSequence).to.eql(modulesLoader.scope.dbSequence);
			});

			describe('should assign logic', function () {

				it('should assign block', function () {
					expect(library.logic.block).to.eql(blockMock);
				});

				it('should assign transaction', function () {
					expect(library.logic.transaction).to.eql(transactionMock);
				});
			});
		});

		it('should call library.logger.trace with "Blocks->Utils: Submodule initialized."', function () {
			expect(loggerStub.trace.args[0][0]).to.equal('Blocks->Utils: Submodule initialized.');
		});
	});

	describe('onBind', function () {

		var modulesStub;
		var modules;

		before(function () {
			modulesStub = {
				blocks: {
					lastBlock: {
						get: sinonSandbox.stub().returns({id: '9314232245035524467', height: 1}),
						set: sinonSandbox.stub().returns({id: '9314232245035524467', height: 1})
					},
					utils: {
						readDbRows: blocksUtilsModule.readDbRows
					}
				}
			};
			loggerStub.trace.reset();
			__private.loaded = false;

			blocksUtilsModule.onBind(modulesStub);
			modules = BlocksUtils.__get__('modules');
		});

		it('should call library.logger.trace with "Blocks->Utils: Shared modules bind."', function () {
			expect(loggerStub.trace.args[0][0]).to.equal('Blocks->Utils: Shared modules bind.');
		});

		it('should create a modules object { blocks: scope.blocks }', function () {
			expect(modules.blocks).to.equal(modulesStub.blocks);
		});

		it('should set __private.loaded to true', function () {
			expect(__private.loaded).to.be.true;
		});
	});

	describe('readDbRows', function () {

		it('should transform a full_blocks_list view row into a block object', function (done) {
			var blockObject = blocksUtilsModule.readDbRows(viewRow_full_blocks_list);

			expect(blockObject[0].id).to.equal(viewRow_full_blocks_list[0].b_id);
			expect(blockObject[0].height).to.equal(viewRow_full_blocks_list[0].b_height);
			expect(blockObject[0].transactions[0].id).to.equal(viewRow_full_blocks_list[0].t_id);
			expect(blockObject[0].transactions[0].type).to.equal(viewRow_full_blocks_list[0].t_type);
			done();
		});

		it('should generate fake signature for genesis block', function (done) {
			var genesisBlock_view_full_blocks_list = [
				{
					b_id: '6524861224470851795',
					b_height: 1,
					t_id: '1465651642158264047',
					t_type: 0
				},{
					b_id: '6524861224470851795',
					b_height: 1,
					t_id: '3634383815892709956',
					t_type: 2
				}
			];

			var blockObject = blocksUtilsModule.readDbRows(genesisBlock_view_full_blocks_list);

			expect(blockObject[0].id).to.equal('6524861224470851795');
			expect(blockObject[0].generationSignature).to.equal('0000000000000000000000000000000000000000000000000000000000000000');
			done();
		});
	});

	describe('loadBlocksPart', function () {

		it('should return error when loadLastBlock sql fails', function (done) {
			library.db.blocks.loadLastBlock = sinonSandbox.stub().resolves();

			blocksUtilsModule.loadLastBlock(function (err, cb) {
				expect(err).to.equal('Blocks#loadLastBlock error');
				done();
			});
		});

		it('should return block object', function (done) {
			library.db.blocks.loadLastBlock = sinonSandbox.stub().resolves(viewRow_full_blocks_list);

			blocksUtilsModule.loadLastBlock(function (err, cb) {
				expect(err).to.be.null;
				expect(cb).to.be.an('object');
				expect(cb.id).to.equal('13068833527549895884');
				expect(cb.transactions[0].id).to.equal('6950874693022090568');
				done();
			});
		});
	});

	describe('loadLastBlock', function () {

		it('should return error when loadLastBlock sql fails', function (done) {
			library.db.blocks.loadLastBlock = sinonSandbox.stub().resolves();
			loggerStub.error.reset();

			blocksUtilsModule.loadLastBlock(function (err, cb) {
				expect(loggerStub.error.args[0][0]).to.contains('TypeError: Cannot read property \'length\' of undefined');
				expect(err).to.equal('Blocks#loadLastBlock error');
				done();
			});
		});

		describe('sorting the block.transactions array', function () {

			it('should move votes to the end when block is genesis block', function (done) {
				var genesisBlock_votes = [
					{
						b_id: '6524861224470851795',
						b_height: 1,
						t_id: '1465651642158264047',
						t_type: 3
					},{
						b_id: '6524861224470851795',
						b_height: 1,
						t_id: '3634383815892709956',
						t_type: 2
					},{
						b_id: '6524861224470851795',
						b_height: 1,
						t_id: '3634383815892709957',
						t_type: 0
					}
				];
				library.db.blocks.loadLastBlock = sinonSandbox.stub().resolves(genesisBlock_votes);

				blocksUtilsModule.loadLastBlock(function (err, cb) {
					expect(cb).to.be.an('object');
					expect(cb.id).to.equal('6524861224470851795');
					expect(cb.transactions[0].id).to.equal('3634383815892709956');
					expect(cb.transactions[0].type).to.equal(2);
					expect(cb.transactions[1].id).to.equal('3634383815892709957');
					expect(cb.transactions[1].type).to.equal(0);
					expect(cb.transactions[2].id).to.equal('1465651642158264047');
					expect(cb.transactions[2].type).to.equal(3);
					done();
				});
			});

			it('should move signatures to the end', function (done) {
				var genesisBlock_votes = [
					{
						b_id: '6524861224470851000',
						b_height: 1,
						t_id: '1465651642158264047',
						t_type: 3
					},{
						b_id: '6524861224470851000',
						b_height: 1,
						t_id: '3634383815892709955',
						t_type: 2
					},{
						b_id: '6524861224470851000',
						b_height: 1,
						t_id: '3634383815892709956',
						t_type: 1
					},{
						b_id: '6524861224470851000',
						b_height: 1,
						t_id: '3634383815892709957',
						t_type: 0
					}
				];
				library.db.blocks.loadLastBlock = sinonSandbox.stub().resolves(genesisBlock_votes);

				blocksUtilsModule.loadLastBlock(function (err, cb) {
					expect(cb).to.be.an('object');
					expect(cb.id).to.equal('6524861224470851000');
					expect(cb.transactions[0].id).to.equal('1465651642158264047');
					expect(cb.transactions[0].type).to.equal(3);
					expect(cb.transactions[1].id).to.equal('3634383815892709955');
					expect(cb.transactions[1].type).to.equal(2);
					expect(cb.transactions[2].id).to.equal('3634383815892709957');
					expect(cb.transactions[2].type).to.equal(0);
					expect(cb.transactions[3].id).to.equal('3634383815892709956');
					expect(cb.transactions[3].type).to.equal(1);
					done();
				});
			});
		});
	});

	describe('getIdSequence', function () {

		it('should return error when library.db.blocks.getIdSequence fails', function (done) {
			loggerStub.error.reset();

			blocksUtilsModule.getIdSequence(10, function (err, cb) {
				expect(loggerStub.error.args[0][0]).to.contains('TypeError: Cannot read property \'length\' of undefined');
				expect(err).to.equal('Blocks#getIdSequence error');
				done();
			});
		});

		it('should return error when no row is found', function (done) {
			library.db.blocks.getIdSequence = sinonSandbox.stub().resolves([]);

			blocksUtilsModule.getIdSequence(10, function (err, cb) {
				expect(err).to.equal('Failed to get id sequence for height: 10');
				done();
			});
		});

		it('should return valid block id list', function (done) {
			library.db.blocks.getIdSequence = sinonSandbox.stub().resolves([{id: 1, height:2}, {id: 2, height:3}, {id: 3, height:4}, {id: 4, height:5}]);

			blocksUtilsModule.getIdSequence(10, function (err, cb) {
				expect(cb.firstHeight).to.equal(1);
				expect(cb.ids).to.equal('9314232245035524467,1,2,3,4,6524861224470851795');
				done();
			});
		});
	});

	describe('loadBlocksData', function () {

		it('should return error when loadBlocksData fails', function (done) {
			library.db.blocks.getHeightByLastId = sinonSandbox.stub().resolves();
			loggerStub.error.reset();

			blocksUtilsModule.loadBlocksData({id: '1'}, function (err, cb) {
				expect(loggerStub.error.args[0][0]).to.contains('TypeError: Cannot read property \'length\' of undefined');
				expect(err).to.equal('Blocks#loadBlockData error');
				done();
			});
		});

		it('should return error when called with both id and lastId', function (done) {
			library.db.blocks.getHeightByLastId = sinonSandbox.stub().resolves(['1']);

			blocksUtilsModule.loadBlocksData({id: '1', lastId: '5'}, function (err, cb) {
				expect(err).to.equal('Invalid filter: Received both id and lastId');
				done();
			});
		});

		it('should return empty row when called with invalid id', function (done) {
			blocksUtilsModule.loadBlocksData({id: '1'}, function (err, cb) {
				expect(cb.length).to.equal(0);
				done();
			});
		});

		it('should return one row when called with valid id', function (done) {
			blocksUtilsModule.loadBlocksData({id: '13068833527549895884'}, function (err, cb) {
				expect(cb[0]).to.deep.equal(viewRow_full_blocks_list[0]);
				done();
			});
		});
	});

	describe('getBlockProgressLogger', function () {

		var testTracker;

		beforeEach(function () {
			loggerStub.info.reset();
		});

		it('should initialize BlockProgressLogger', function (done) {
			testTracker = blocksUtilsModule.getBlockProgressLogger(1, 1, 'Test tracker');
			done();
		});

		it('should return valid log information when call applyNext()', function (done) {
			testTracker.applyNext();
			expect(loggerStub.info.args[0][0]).to.equal('Test tracker');
			expect(loggerStub.info.args[0][1]).to.equal('100.0 %: applied 1 of 1 transactions');
			done();
		});

		it('should throw error when times applied >= transactionsCount', function (done) {
			expect(function () {
				testTracker.applyNext();
			}).to.throw('Cannot apply transaction over the limit: 1');
			done();
		});

		it('should return valid log information when reset tracker and call applyNext()', function (done) {
			testTracker.reset();
			testTracker.applyNext();
			expect(loggerStub.info.args[0][0]).to.equal('Test tracker');
			expect(loggerStub.info.args[0][1]).to.equal('100.0 %: applied 1 of 1 transactions');
			done();
		});
	});
});
