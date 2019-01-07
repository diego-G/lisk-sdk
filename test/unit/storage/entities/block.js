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

const { BaseEntity, Block } = require('../../../../storage/entities');
const storageSandbox = require('../../../common/storage_sandbox');
const {
	NonSupportedFilterTypeError,
	NonSupportedOptionError,
	NonSupportedOperationError,
} = require('../../../../storage/errors');

describe('Block', () => {
	let adapter;
	let validBlockFields;
	let validBlockSQLs;
	let validFilters;
	let addFieldSpy;
	let invalidFilter;
	let validFilter;
	let invalidOptions;
	let validOptions;
	let validBlock;
	let invalidBlock;
	let storage;

	before(async () => {
		storage = new storageSandbox.StorageSandbox(
			__testContext.config.db,
			'lisk_test_blocks'
		);
		await storage.bootstrap();

		validBlockFields = [
			'id',
			'height',
			'blockSignature',
			'generatorPublicKey',
			'payloadHash',
			'payloadLength',
			'numberOfTransactions',
			'previousBlockId',
			'timestamp',
			'totalAmount',
			'totalFee',
			'reward',
			'version',
			'confirmations',
		];

		validBlockSQLs = ['select', 'create', 'count', 'isPersisted'];

		validFilters = [
			'blockSignature',
			'blockSignature_eql',
			'blockSignature_in',
			'blockSignature_like',
			'blockSignature_ne',
			'confirmations',
			'confirmations_eql',
			'confirmations_gt',
			'confirmations_gte',
			'confirmations_in',
			'confirmations_lt',
			'confirmations_lte',
			'confirmations_ne',
			'generatorPublicKey',
			'generatorPublicKey_eql',
			'generatorPublicKey_in',
			'generatorPublicKey_like',
			'generatorPublicKey_ne',
			'height',
			'height_eql',
			'height_gt',
			'height_gte',
			'height_in',
			'height_lt',
			'height_lte',
			'height_ne',
			'id',
			'id_eql',
			'id_in',
			'id_like',
			'id_ne',
			'numberOfTransactions',
			'numberOfTransactions_eql',
			'numberOfTransactions_gt',
			'numberOfTransactions_gte',
			'numberOfTransactions_in',
			'numberOfTransactions_lt',
			'numberOfTransactions_lte',
			'numberOfTransactions_ne',
			'payloadHash',
			'payloadHash_eql',
			'payloadHash_in',
			'payloadHash_like',
			'payloadHash_ne',
			'payloadLength',
			'payloadLength_eql',
			'payloadLength_gt',
			'payloadLength_gte',
			'payloadLength_in',
			'payloadLength_lt',
			'payloadLength_lte',
			'payloadLength_ne',
			'previousBlockId',
			'previousBlockId_eql',
			'previousBlockId_in',
			'previousBlockId_like',
			'previousBlockId_ne',
			'reward',
			'reward_eql',
			'reward_gt',
			'reward_gte',
			'reward_in',
			'reward_lt',
			'reward_lte',
			'reward_ne',
			'timestamp',
			'timestamp_eql',
			'timestamp_gt',
			'timestamp_gte',
			'timestamp_in',
			'timestamp_lt',
			'timestamp_lte',
			'timestamp_ne',
			'totalAmount',
			'totalAmount_eql',
			'totalAmount_gt',
			'totalAmount_gte',
			'totalAmount_in',
			'totalAmount_lt',
			'totalAmount_lte',
			'totalAmount_ne',
			'totalFee',
			'totalFee_eql',
			'totalFee_gt',
			'totalFee_gte',
			'totalFee_in',
			'totalFee_lt',
			'totalFee_lte',
			'totalFee_ne',
			'version',
			'version_eql',
			'version_gt',
			'version_gte',
			'version_in',
			'version_lt',
			'version_lte',
			'version_ne',
		];

		invalidFilter = {
			invalid: true,
			filter: true,
		};

		validFilter = {
			id: '7807109686729042739',
		};

		validBlock = {
			id: '7807109686729042739',
			height: 1,
			blockSignature:
				'a47d07d3a8d8024eb44672bc6d07cdcd1cd03803d9612b7b10c10d5a844fb8f6ed11fab5159b6d9826b7302c3d3f5d7d29d13b40e6fe59c9374f4ec94af4eb0f',
			generatorPublicKey:
				'73ec4adbd8f99f0d46794aeda3c3d86b245bd9d27be2b282cdd38ad21988556b',
			payloadHash:
				'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
			payloadLength: 19619,
			numberOfTransactions: 103,
			previousBlockId: null,
			timestamp: 0,
			totalAmount: '10000000000000000',
			totalFee: '0',
			reward: '0',
			version: '0',
		};

		invalidBlock = {
			id: null,
			height: '1',
			blockSignature: '',
			generatorPublicKey: '',
			payloadHash: '',
			payloadLength: 0,
			numberOfTransactions: 25,
			previousBlockId: '',
			timestamp: 0,
			totalAmount: '',
			totalFee: '0',
			reward: '0',
			version: 0,
		};

		invalidOptions = {
			foo: true,
			bar: true,
		};

		validOptions = {
			limit: 100,
			offset: 0,
			sort: 'height:asc',
		};

		adapter = storage.adapter;
		addFieldSpy = sinonSandbox.spy(Block.prototype, 'addField');
	});

	afterEach(async () => {
		sinonSandbox.reset();
		await storageSandbox.clearDatabaseTable(storage, storage.logger, 'blocks');
	});

	it('should be a constructable function', async () => {
		expect(Block.prototype.constructor).to.be.not.null;
		expect(Block.prototype.constructor.name).to.be.eql('Block');
	});

	it('should extend BaseEntity', async () => {
		expect(Block.prototype instanceof BaseEntity).to.be.true;
	});

	describe('constructor()', () => {
		it('should accept only one mandatory parameter', async () => {
			expect(Block.prototype.constructor.length).to.be.eql(1);
		});

		it('should have called super', async () => {
			// The reasoning here is that if the parent's contstructor was called
			// the properties from the parent are present in the extending object
			const block = new Block(adapter);
			expect(typeof block.parseFilters).to.be.eql('function');
			expect(typeof block.addFilter).to.be.eql('function');
			expect(typeof block.addField).to.be.eql('function');
			expect(typeof block.getFilters).to.be.eql('function');
			expect(typeof block.getUpdateSet).to.be.eql('function');
			expect(typeof block.getValuesSet).to.be.eql('function');
			expect(typeof block.begin).to.be.eql('function');
			expect(typeof block.validateFilters).to.be.eql('function');
			expect(typeof block.validateOptions).to.be.eql('function');
		});

		it('should assign proper sql', async () => {
			const block = new Block(adapter);
			expect(block.SQLs).to.include.all.keys(validBlockSQLs);
		});

		it('should call addField the exact number of times', async () => {
			const block = new Block(adapter);
			expect(addFieldSpy.callCount).to.eql(Object.keys(block.fields).length);
		});

		it('should setup correct fields', async () => {
			const block = new Block(adapter);
			expect(block.fields).to.include.all.keys(validBlockFields);
		});

		it('should setup specific filters');
	});

	describe('getOne()', () => {
		it('should call _getResults with the correct expectedResultCount', async () => {
			const block = new Block(adapter);
			const _getResultsStub = sinonSandbox
				.stub(block, '_getResults')
				.returns(validBlock);
			block.getOne(validFilter, validOptions, null);
			const _getResultsCall = _getResultsStub.firstCall.args;
			expect(_getResultsCall).to.be.eql([validFilter, validOptions, null, 1]);
		});
	});

	describe('get()', () => {
		it('should call _getResults with the correct expectedResultCount', async () => {
			const block = new Block(adapter);
			const _getResultsStub = sinonSandbox
				.stub(block, '_getResults')
				.returns([validBlock]);
			block.get(validFilter, validOptions, null);
			const _getResultsCall = _getResultsStub.firstCall.args;
			expect(_getResultsCall).to.be.eql([validFilter, validOptions, null]);
		});
	});

	describe('_getResults()', () => {
		it('should accept only valid filters', async () => {
			const block = new Block(adapter);
			return expect(block.get(validFilter)).to.not.be.rejectedWith(
				NonSupportedFilterTypeError
			);
		});

		it('should throw error for invalid filters', async () => {
			const block = new Block(adapter);
			return expect(block.get(invalidFilter)).to.be.rejectedWith(
				NonSupportedFilterTypeError
			);
		});

		it('should accept only valid options', async () => {
			const block = new Block(adapter);
			return expect(block.get({}, validOptions)).to.not.be.rejectedWith(
				NonSupportedOptionError
			);
		});

		it('should throw error for invalid options', async () => {
			const block = new Block(adapter);
			return expect(block.get({}, invalidOptions)).to.be.rejectedWith(
				NonSupportedOptionError
			);
		});

		it('should accept "tx" as last parameter and pass to adapter.executeFile');

		it('should not change any of the provided parameter');

		describe('filters', () => {
			// To make add/remove filters we add their tests.
			it('should have only specific filters', async () => {
				const block = new Block(adapter);
				expect(block.getFilters()).to.have.members(validFilters);
			});
			// For each filter type
			it('should return matching result for provided filter');
		});
	});

	describe('create()', () => {
		it('should call getValuesSet with proper params', async () => {
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
				executeFile: sinonSandbox.stub().resolves([validBlock]),
				parseQueryComponent: sinonSandbox.stub(),
			};

			const block = new Block(localAdapter);
			block.getValuesSet = sinonSandbox.stub();
			block.create(validBlock);
			expect(block.getValuesSet.calledWith(validBlock)).to.be.true;
		});

		it('should create a block object successfully', async () => {
			await storage.entities.Block.create(validBlock);
			const result = await storage.entities.Block.getOne({ id: validBlock.id });
			expect(result).to.be.eql({ ...validBlock, confirmations: 1 });
		});

		it('should skip if any invalid attribute is provided');

		it('should reject with invalid data provided', async () => {
			return expect(storage.entities.Block.create(invalidBlock)).to.be.rejected;
		});

		it('should create multiple objects successfully');
	});

	describe('update()', () => {
		it('should always throw NonSupportedOperationError', async () => {
			expect(Block.prototype.update).to.throw(NonSupportedOperationError);
		});
	});

	describe('updateOne()', () => {
		it('should always throw NonSupportedOperationError', async () => {
			expect(Block.prototype.updateOne).to.throw(NonSupportedOperationError);
		});
	});

	describe('isPersisted()', () => {
		afterEach(async () => {
			await storageSandbox.clearDatabaseTable(
				storage,
				storage.logger,
				'blocks'
			);
		});

		it('should accept only valid filters', async () => {
			const block = new Block(adapter);
			expect(() => {
				block.isPersisted(validFilter);
			}).not.to.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const block = new Block(adapter);
			expect(() => {
				block.isPersisted(invalidFilter);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should call mergeFilters with proper params', async () => {
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
				executeFile: sinonSandbox.stub().resolves([validBlock]),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const block = new Block(localAdapter);
			block.mergeFilters = sinonSandbox.stub();
			block.parseFilters = sinonSandbox.stub();
			block.isPersisted(validFilter);
			expect(block.mergeFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call parseFilters with proper params', async () => {
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile'),
				executeFile: sinonSandbox.stub().resolves([validBlock]),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const block = new Block(localAdapter);
			block.mergeFilters = sinonSandbox.stub().returns(validFilter);
			block.parseFilters = sinonSandbox.stub();
			block.isPersisted(validFilter);
			expect(block.parseFilters.calledWith(validFilter)).to.be.true;
		});

		it('should call adapter.executeFile with proper params', async () => {
			const localAdapter = {
				loadSQLFile: sinonSandbox.stub().returns('loadSQLFile response'),
				executeFile: sinonSandbox.stub().resolves([validBlock]),
				parseQueryComponent: sinonSandbox.stub(),
			};
			const block = new Block(localAdapter);
			block.mergeFilters = sinonSandbox.stub();
			block.parseFilters = sinonSandbox
				.stub()
				.returns('parsedFilters response');
			block.isPersisted(validFilter);
			expect(
				localAdapter.executeFile.calledWith(
					'loadSQLFile response',
					{
						parsedFilters: 'parsedFilters response',
					},
					{ expectedResultCount: 1 },
					undefined
				)
			).to.be.true;
		});

		it('should resolve with true if matching record found', async () => {
			await storage.entities.Block.create(validBlock);
			const res = await storage.entities.Block.isPersisted({
				id: validBlock.id,
			});
			expect(res).to.be.true;
		});

		it('should resolve with false if matching record not found', async () => {
			await storage.entities.Block.create(validBlock);
			const res = await storage.entities.Block.isPersisted({
				id: invalidBlock.id,
			});
			expect(res).to.be.false;
		});
	});

	describe('count()', () => {
		let block;

		before(async () => {
			block = new Block(adapter);
		});

		it('should accept valid filters', async () => {
			const filters = [{ height: 101 }, { timestamp_gte: 1234567890 }];
			expect(() => {
				block.count(filters);
			}).to.not.throw(NonSupportedFilterTypeError);
		});

		it('should throw error for invalid filters', async () => {
			const filters = [{ invalid_filter: 1 }, { timestamp_gte: 1234567890 }];
			expect(() => {
				block.count(filters);
			}).to.throw(NonSupportedFilterTypeError);
		});

		it('should resolve with 1 item', async () => {
			await storage.entities.Block.create(validBlock);
			const res = await storage.entities.Block.count();
			expect(res).to.be.eql(1);
		});
	});

	describe('mergeFilters()', () => {
		it('should accept filters as single object', async () => {
			const block = new Block(adapter);
			const mergeFiltersSpy = sinonSandbox.spy(block, 'mergeFilters');
			expect(() => {
				block.get(validFilter);
			}).not.to.throw(NonSupportedFilterTypeError);
			expect(mergeFiltersSpy.calledWith(validFilter)).to.be.true;
		});

		it('should accept filters as array of objects', async () => {
			const block = new Block(adapter);
			const mergeFiltersSpy = sinonSandbox.spy(block, 'mergeFilters');
			expect(() => {
				block.get([validFilter, validFilter]);
			}).not.to.throw(NonSupportedFilterTypeError);
			expect(mergeFiltersSpy.calledWith([validFilter, validFilter])).to.be.true;
		});

		it('should merge provided filter with default filters by preserving default filters values', async () => {
			const defaultFilters = { version: 1 };
			const block = new Block(adapter, defaultFilters);
			const filters = { height: 101 };
			const expectedResult = { height: 101, version: 1 };
			expect(block.mergeFilters(filters)).to.be.eql(expectedResult);
		});
	});
});
