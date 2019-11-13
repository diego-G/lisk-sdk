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

const path = require('path');
const assert = require('assert');
const {
	entities: { BaseEntity },
	utils: {
		filterTypes: { NUMBER, TEXT },
	},
} = require('../../../../../components/storage');

const sqlFiles = {
	create: 'temp_block/create.sql',
	delete: 'temp_block/delete.sql',
	get: 'temp_block/get.sql',
	truncate: 'temp_block/truncate.sql',
	isEmpty: 'temp_block/isEmpty.sql',
};

/**
 * Temp Block
 * @typedef {Object} TempBlock
 * @property {string} id - the id of the block
 * @property {number} height - the height of the block
 * @property {object} fullBlock - full block with transactions
 */

/**
 * Temp Block Filters
 * @typedef {Object} filters.TempBlock
 * @property {number} [id]
 * @property {string} [id_eql]
 * @property {string} [id_ne]
 * @property {string} [id_in]
 * @property {string} [id_like]
 * @property {number} [height]
 * @property {number} [height_eql]
 * @property {number} [height_ne]
 * @property {number} [height_gt]
 * @property {number} [height_gte]
 * @property {number} [height_lt]
 * @property {number} [height_lte]
 * @property {number} [height_in]
 */

class TempBlock extends BaseEntity {
	/**
	 * Constructor
	 * @param {BaseAdapter} adapter - Adapter to retrieve the data from
	 * @param {filters.TempBlock} defaultFilters - Set of default filters applied on every query
	 */
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.addField('id', 'string', { filter: TEXT });
		this.addField('height', 'number', { filter: NUMBER });
		this.addField('fullBlock', 'string');

		this.extendDefaultOptions({ sort: '' });

		this.sqlDirectory = path.join(path.dirname(__filename), '../sql');

		this.SQLs = this.loadSQLFiles('temp_block', sqlFiles, this.sqlDirectory);
	}

	/**
	 * Create TempBlock entry
	 *
	 * @param {TempBlock} tempBlock - temp block entry
	 * @param {Object} [_options]
	 * @param {Object} [tx] - Transaction object
	 * @return {Promise} Promise object which represents if the entry was created in the database
	 */
	// eslint-disable-next-line no-unused-vars
	create({ height, id, fullBlock }, _options = {}, tx = null) {
		assert(height && Number.isInteger(height), 'height must be a number');
		assert(id && typeof id === 'string', 'id must be a string');
		assert(fullBlock instanceof Object, 'block must be an object');

		const attributes = Object.keys(this.fields);
		const fields = Object.keys(this.fields)
			.map(k => `"${this.fields[k].fieldName}"`)
			.join(',');

		const values = [{ height, id, fullBlock: JSON.stringify(fullBlock) }];
		const createSet = this.getValuesSet(values, attributes);

		return this.adapter.executeFile(
			this.SQLs.create,
			{ createSet, fields },
			{ expectedResultCount: 0 },
			tx,
		);
	}

	/**
	 * Get a list of TempBlock entries
	 * @param {filters.TempBlock|filters.TempBlock[]} filters
	 * @param {Object} [options]
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Object} [tx] - Transaction object
	 * @return {Promise} Promise object which represents the response returned from the database
	 */
	async get(filters = {}, options = {}, tx = null) {
		return this._getResults(filters, options, tx);
	}

	/**
	 * Get one entry of TempBlock
	 * @param {filters.TempBlock|filters.TempBlock[]} filters
	 * @param {Object} [options]
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Object} [tx] - Transaction object
	 * @return {Promise} Promise object which represents the response returned from the database
	 */
	async getOne(filters = {}, options = {}, tx = null) {
		const expectedResultCount = 1;
		return this._getResults(filters, options, tx, expectedResultCount);
	}

	/**
	 * Get list of temp blocks
	 *
	 * @param {filters.TempBlock|filters.TempBlock[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Object} [tx] - Database transaction object
	 * @return {Promise.<TempBlock[], Error>}
	 */
	_getResults(filters, options, tx, expectedResultCount = undefined) {
		this.validateFilters(filters);
		this.validateOptions(options);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const { limit, offset, sort } = { ...options, ...this.defaultOptions };
		const parsedSort = this.parseSort(sort);

		const params = {
			limit,
			offset,
			parsedSort,
			parsedFilters,
		};

		return this.adapter.executeFile(
			this.SQLs.get,
			params,
			{ expectedResultCount },
			tx,
		);
	}

	/**
	 * Delete records with following conditions
	 *
	 * @param {filters.TempBlock} filters
	 * @param {Object} [options]
	 * @param {Object} [tx]
	 * @returns {Promise.<boolean, Error>}
	 */
	delete(filters, _options, tx = null) {
		this.validateFilters(filters);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);

		return this.adapter
			.executeFile(
				this.SQLs.delete,
				{ parsedFilters },
				{ expectedResultCount: 0 },
				tx,
			)
			.then(result => result);
	}

	/**
	 * Delete all rows in table
	 *
	 * @param {Object} [tx]
	 * @returns {Promise.<boolean, Error>}
	 */
	truncate(tx = null) {
		return this.adapter.executeFile(
			this.SQLs.truncate,
			{},
			{ expectedResultCount: 0 },
			tx,
		);
	}

	/**
	 * Check if table is empty (true)
	 *
	 * @param {Object} [tx]
	 * @returns {Promise.<boolean, Error>}
	 */
	isEmpty(tx = null) {
		return this.adapter
			.executeFile(this.SQLs.isEmpty, {}, {}, tx)
			.then(([result]) => (result ? result.bool : true));
	}
}

module.exports = TempBlock;
