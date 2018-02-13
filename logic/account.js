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

var _ = require('lodash');
var constants = require('../helpers/constants.js');
var sortBy = require('../helpers/sort_by.js');
var Bignum = require('../helpers/bignum.js');
var BlockReward = require('./block_reward.js');

// Private fields
var self; // eslint-disable-line no-unused-vars
var library;
var modules;

var __private = {};

/**
 * Main account logic.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires lodash
 * @requires helpers/constants
 * @requires helpers/sort_by
 * @requires helpers/bignum
 * @requires logic/block_reward
 * @param {Database} db - Description of the param
 * @param {ZSchema} schema - Description of the param
 * @param {Object} logger - Description of the param
 * @param {function} cb - Callback function.
 * @property {account_model} model
 * @property {account_schema} schema
 * @returns {Immediate} With `this` as data.
 * @todo Add description of the params
 */
function Account(db, schema, logger, cb) {
	this.scope = {
		db: db,
		schema: schema,
	};

	__private.blockReward = new BlockReward();

	self = this;
	library = {
		logger: logger,
	};

	this.table = 'mem_accounts';

	this.model = [
		{
			name: 'username',
			type: 'String',
			conv: String,
			immutable: true,
		},
		{
			name: 'isDelegate',
			type: 'SmallInt',
			conv: Boolean,
		},
		{
			name: 'u_isDelegate',
			type: 'SmallInt',
			conv: Boolean,
		},
		{
			name: 'secondSignature',
			type: 'SmallInt',
			conv: Boolean,
		},
		{
			name: 'u_secondSignature',
			type: 'SmallInt',
			conv: Boolean,
		},
		{
			name: 'u_username',
			type: 'String',
			conv: String,
			immutable: true,
		},
		{
			name: 'address',
			type: 'String',
			conv: String,
			immutable: true,
			expression: 'UPPER(a.address)',
		},
		{
			name: 'publicKey',
			type: 'Binary',
			conv: String,
			immutable: true,
			expression: 'ENCODE("publicKey", \'hex\')',
		},
		{
			name: 'secondPublicKey',
			type: 'Binary',
			conv: String,
			immutable: true,
			expression: 'ENCODE("secondPublicKey", \'hex\')',
		},
		{
			name: 'balance',
			type: 'BigInt',
			conv: Number,
			expression: '("balance")::bigint',
		},
		{
			name: 'u_balance',
			type: 'BigInt',
			conv: Number,
			expression: '("u_balance")::bigint',
		},
		{
			name: 'rate',
			type: 'BigInt',
			conv: Number,
			expression: '("rate")::bigint',
		},
		{
			name: 'delegates',
			type: 'Text',
			conv: Array,
			expression: `(SELECT ARRAY_AGG("dependentId") FROM ${
				this.table
			}2delegates WHERE "accountId" = a."address")`,
		},
		{
			name: 'u_delegates',
			type: 'Text',
			conv: Array,
			expression: `(SELECT ARRAY_AGG("dependentId") FROM ${
				this.table
			}2u_delegates WHERE "accountId" = a."address")`,
		},
		{
			name: 'multisignatures',
			type: 'Text',
			conv: Array,
			expression: `(SELECT ARRAY_AGG("dependentId") FROM ${
				this.table
			}2multisignatures WHERE "accountId" = a."address")`,
		},
		{
			name: 'u_multisignatures',
			type: 'Text',
			conv: Array,
			expression: `(SELECT ARRAY_AGG("dependentId") FROM ${
				this.table
			}2u_multisignatures WHERE "accountId" = a."address")`,
		},
		{
			name: 'multimin',
			type: 'SmallInt',
			conv: Number,
		},
		{
			name: 'u_multimin',
			type: 'SmallInt',
			conv: Number,
		},
		{
			name: 'multilifetime',
			type: 'SmallInt',
			conv: Number,
		},
		{
			name: 'u_multilifetime',
			type: 'SmallInt',
			conv: Number,
		},
		{
			name: 'blockId',
			type: 'String',
			conv: String,
		},
		{
			name: 'nameexist',
			type: 'SmallInt',
			conv: Boolean,
		},
		{
			name: 'u_nameexist',
			type: 'SmallInt',
			conv: Boolean,
		},
		{
			name: 'fees',
			type: 'BigInt',
			conv: Number,
			expression: '(a."fees")::bigint',
		},
		{
			name: 'rank',
			type: 'BigInt',
			conv: Number,
			expression:
				'(SELECT m.row_number FROM (SELECT row_number() OVER (ORDER BY r."vote" DESC, r."publicKey" ASC), address FROM (SELECT d."isDelegate", d.vote, d."publicKey", d.address FROM mem_accounts AS d WHERE d."isDelegate" = 1) AS r) m WHERE m."address" = a."address")::int',
		},
		{
			name: 'rewards',
			type: 'BigInt',
			conv: Number,
			expression: '(a."rewards")::bigint',
		},
		{
			name: 'vote',
			type: 'BigInt',
			conv: Number,
			expression: '(a."vote")::bigint',
		},
		{
			name: 'producedBlocks',
			type: 'BigInt',
			conv: Number,
			expression: '(a."producedblocks")::bigint',
		},
		{
			name: 'missedBlocks',
			type: 'BigInt',
			conv: Number,
			expression: '(a."missedblocks")::bigint',
		},
		{
			name: 'virgin',
			type: 'SmallInt',
			conv: Boolean,
			immutable: true,
		},
		{
			name: 'approval',
			type: 'integer',
			dependentFields: ['vote'],
			computedField: true,
		},
		{
			name: 'productivity',
			type: 'integer',
			dependentFields: ['producedBlocks', 'missedBlocks', 'rank'],
			computedField: true,
		},
	];

	this.computedFields = this.model.filter(function(field) {
		return field.computedField;
	});

	// Obtains fields from model
	this.fields = this.model.map(function(field) {
		var _tmp = {};

		if (field.expression) {
			_tmp.expression = field.expression;
		} else {
			if (field.mod) {
				_tmp.expression = field.mod;
			}
			_tmp.field = field.name;
		}
		if (_tmp.expression || field.alias) {
			_tmp.alias = field.alias || field.name;
		}

		_tmp.computedField = field.computedField || false;

		return _tmp;
	});

	// Obtains bynary fields from model
	this.binary = [];
	this.model.forEach(
		function(field) {
			if (field.type === 'Binary') {
				this.binary.push(field.name);
			}
		}.bind(this)
	);

	// Obtains conv from model
	this.conv = {};
	this.model.forEach(
		function(field) {
			this.conv[field.name] = field.conv;
		}.bind(this)
	);

	// Obtains editable fields from model
	this.editable = [];
	this.model.forEach(
		function(field) {
			if (!field.immutable) {
				this.editable.push(field.name);
			}
		}.bind(this)
	);

	return setImmediate(cb, null, this);
}

/**
 * @typedef {Object} account_schema
 * @property {string} id - Description of the value
 * @property {string} type - Description of the value
 * @property {Object} properties - Description of the value
 * @property {Object} properties.username - Description of the value
 * @property {string} properties.username.type - Description of the value
 * @property {string} properties.username.format - Description of the value
 * @property {Object} properties.isDelegate - Description of the value
 * @property {string} properties.isDelegate.type - Description of the value
 * @property {number} properties.isDelegate.maximum - Description of the value
 * @property {Object} properties.u_isDelegate - Description of the value
 * @property {string} properties.u_isDelegate.type - Description of the value
 * @property {number} properties.u_isDelegate.maximum - Description of the value
 * @property {Object} properties.secondSignature - Description of the value
 * @property {string} properties.secondSignature.type - Description of the value
 * @property {number} properties.secondSignature.maximum - Description of the value
 * @property {Object} properties.u_secondSignature - Description of the value
 * @property {string} properties.u_secondSignature.type - Description of the value
 * @property {number} properties.u_secondSignature.maximum - Description of the value
 * @property {Object} properties.u_username - Description of the value
 * @property {Array} properties.u_username.anyOf - Description of the value
 * @property {Object} properties.u_username.anyOf[0] - Description of the value
 * @property {string} properties.u_username.anyOf[0].type - Description of the value
 * @property {string} properties.u_username.anyOf[0].format - Description of the value
 * @property {Object} properties.u_username.anyOf[1] - Description of the value
 * @property {string} properties.u_username.anyOf[1].type - Description of the value
 * @property {Object} properties.secondPublicKey - Description of the value
 * @property {Array} properties.secondPublicKey.anyOf - Description of the value
 * @property {Object} properties.secondPublicKey.anyOf[0] - Description of the value
 * @property {string} properties.secondPublicKey.anyOf[0].type - Description of the value
 * @property {string} properties.secondPublicKey.anyOf[0].format - Description of the value
 * @property {Object} properties.secondPublicKey.anyOf[1] - Description of the value
 * @property {string} properties.secondPublicKey.anyOf[1].type - Description of the value
 * @property {Object} properties.address - Description of the value
 * @property {string} properties.address.type - Description of the value
 * @property {string} properties.address.format - Description of the value
 * @property {number} properties.address.minLength - Description of the value
 * @property {number} properties.address.maxLength - Description of the value
 * @property {Object} properties.publicKey - Description of the value
 * @property {string} properties.publicKey.type - Description of the value
 * @property {string} properties.publicKey.format - Description of the value
 * @property {Object} properties.balance - Description of the value
 * @property {string} properties.balance.type - Description of the value
 * @property {number} properties.balance.minimum - Description of the value
 * @property {number} properties.balance.maximum - Description of the value
 * @property {Object} properties.u_balance - Description of the value
 * @property {string} properties.u_balance.type - Description of the value
 * @property {number} properties.u_balance.minimum - Description of the value
 * @property {number} properties.u_balance.maximum - Description of the value
 * @property {Object} properties.rate - Description of the value
 * @property {string} properties.rate.type - Description of the value
 * @property {Object} properties.multimin - Description of the value
 * @property {string} properties.multimin.type - Description of the value
 * @property {number} properties.multimin.minimum - Description of the value
 * @property {number} properties.multimin.maximum - Description of the value
 * @property {Object} properties.u_multimin - Description of the value
 * @property {string} properties.u_multimin.type - Description of the value
 * @property {number} properties.u_multimin.minimum - Description of the value
 * @property {number} properties.u_multimin.maximum - Description of the value
 * @property {Object} properties.multilifetime - Description of the value
 * @property {string} properties.multilifetime.type - Description of the value
 * @property {number} properties.multilifetime.minimum - Description of the value
 * @property {number} properties.multilifetime.maximum - Description of the value
 * @property {Object} properties.u_multilifetime - Description of the value
 * @property {string} properties.u_multilifetime.type - Description of the value
 * @property {number} properties.u_multilifetime.minimum - Description of the value
 * @property {number} properties.u_multilifetime.maximum - Description of the value
 * @property {Object} properties.blockId - Description of the value
 * @property {string} properties.blockId.type - Description of the value
 * @property {string} properties.blockId.format - Description of the value
 * @property {number} properties.blockId.minLength - Description of the value
 * @property {number} properties.blockId.maxLength - Description of the value
 * @property {Object} properties.nameexist - Description of the value
 * @property {string} properties.nameexist.type - Description of the value
 * @property {number} properties.nameexist.maximum - Description of the value
 * @property {Object} properties.u_nameexist - Description of the value
 * @property {string} properties.u_nameexist.type - Description of the value
 * @property {number} properties.u_nameexist.maximum - Description of the value
 * @property {Object} properties.fees - Description of the value
 * @property {string} properties.fees.type - Description of the value
 * @property {number} properties.fees.minimum - Description of the value
 * @property {Object} properties.rank - Description of the value
 * @property {number} properties.rank.type - Description of the value
 * @property {Object} properties.rewards - Description of the value
 * @property {string} properties.rewards.type - Description of the value
 * @property {number} properties.rewards.minimum - Description of the value
 * @property {Object} properties.vote - Description of the value
 * @property {number} properties.vote.type - Description of the value
 * @property {Object} properties.producedBlocks - Description of the value
 * @property {number} properties.producedBlocks.type - Description of the value
 * @property {Object} properties.missedBlocks - Description of the value
 * @property {number} properties.missedBlocks.type - Description of the value
 * @property {Object} properties.virgin - Description of the value
 * @property {string} properties.virgin.type - Description of the value
 * @property {number} properties.virgin.maximum - Description of the value
 * @property {Object} properties.approval - Description of the value
 * @property {number} properties.approval.type - Description of the value
 * @property {Object} properties.productivity - Description of the value
 * @property {number} properties.productivity.type - Description of the value
 * @todo Add descriptions of the values
 */
Account.prototype.schema = {
	id: 'Account',
	type: 'object',
	properties: {
		username: {
			type: 'string',
			format: 'username',
		},
		isDelegate: {
			type: 'integer',
			maximum: 32767,
		},
		u_isDelegate: {
			type: 'integer',
			maximum: 32767,
		},
		secondSignature: {
			type: 'integer',
			maximum: 32767,
		},
		u_secondSignature: {
			type: 'integer',
			maximum: 32767,
		},
		u_username: {
			anyOf: [
				{
					type: 'string',
					format: 'username',
				},
				{
					type: 'null',
				},
			],
		},
		address: {
			type: 'string',
			format: 'address',
			minLength: 1,
			maxLength: 22,
		},
		publicKey: {
			type: 'string',
			format: 'publicKey',
		},
		secondPublicKey: {
			anyOf: [
				{
					type: 'string',
					format: 'publicKey',
				},
				{
					type: 'null',
				},
			],
		},
		balance: {
			type: 'integer',
			minimum: 0,
			maximum: constants.totalAmount,
		},
		u_balance: {
			type: 'integer',
			minimum: 0,
			maximum: constants.totalAmount,
		},
		rate: {
			type: 'integer',
		},
		delegates: {
			anyOf: [
				{
					type: 'array',
					uniqueItems: true,
				},
				{
					type: 'null',
				},
			],
		},
		u_delegates: {
			anyOf: [
				{
					type: 'array',
					uniqueItems: true,
				},
				{
					type: 'null',
				},
			],
		},
		multisignatures: {
			anyOf: [
				{
					type: 'array',
					minItems: constants.multisigConstraints.keysgroup.minItems,
					maxItems: constants.multisigConstraints.keysgroup.maxItems,
				},
				{
					type: 'null',
				},
			],
		},
		u_multisignatures: {
			anyOf: [
				{
					type: 'array',
					minItems: constants.multisigConstraints.keysgroup.minItems,
					maxItems: constants.multisigConstraints.keysgroup.maxItems,
				},
				{
					type: 'null',
				},
			],
		},
		multimin: {
			type: 'integer',
			minimum: 0,
			maximum: constants.multisigConstraints.min.maximum,
		},
		u_multimin: {
			type: 'integer',
			minimum: 0,
			maximum: constants.multisigConstraints.min.maximum,
		},
		multilifetime: {
			type: 'integer',
			minimum: 0,
			maximum: constants.multisigConstraints.lifetime.maximum,
		},
		u_multilifetime: {
			type: 'integer',
			minimum: 0,
			maximum: constants.multisigConstraints.lifetime.maximum,
		},
		blockId: {
			type: 'string',
			format: 'id',
			minLength: 1,
			maxLength: 20,
		},
		nameexist: {
			type: 'integer',
			maximum: 32767,
		},
		u_nameexist: {
			type: 'integer',
			maximum: 32767,
		},
		fees: {
			type: 'integer',
			minimum: 0,
		},
		rank: {
			type: 'integer',
		},
		rewards: {
			type: 'integer',
			minimum: 0,
		},
		vote: {
			type: 'integer',
		},
		producedBlocks: {
			type: 'integer',
		},
		missedBlocks: {
			type: 'integer',
		},
		virgin: {
			type: 'integer',
			maximum: 32767,
		},
		approval: {
			type: 'integer',
		},
		productivity: {
			type: 'integer',
		},
	},
	required: ['address', 'balance', 'u_balance'],
};

// Public methods
/**
 * Binds input parameters to private variables modules.
 *
 * @param {Blocks} blocks - Description of the param
 * @todo Add description of the param
 */
Account.prototype.bind = function(blocks) {
	modules = {
		blocks: blocks,
	};
};

/**
 * Deletes the contents of these tables:
 * - mem_round
 * - mem_accounts2delegates
 * - mem_accounts2u_delegates
 * - mem_accounts2multisignatures
 * - mem_accounts2u_multisignatures
 *
 * @param {function} cb - Callback function
 * @returns {Immediate} cb|error
 */
Account.prototype.resetMemTables = function(cb) {
	this.scope.db.accounts
		.resetMemTables()
		.then(function() {
			return setImmediate(cb);
		})
		.catch(function(err) {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Account#resetMemTables error');
		});
};

/**
 * Validates account schema.
 *
 * @param {account} account - Description of the param
 * @returns {err|account} Error message or input parameter account.
 * @throws {string} If schema.validate fails, throws 'Failed to validate account schema'.
 * @todo Add description of the param
 */
Account.prototype.objectNormalize = function(account) {
	var report = this.scope.schema.validate(account, Account.prototype.schema);

	if (!report) {
		throw `Failed to validate account schema: ${this.scope.schema
			.getLastErrors()
			.map(function(err) {
				var path = err.path.replace('#/', '').trim();
				return [path, ': ', err.message, ' (', account[path], ')'].join('');
			})
			.join(', ')}`;
	}

	return account;
};

/**
 * Checks type, length and format from publicKey.
 *
 * @param {publicKey} publicKey - Description of the param
 * @throws {string} throws one error for every check
 * @todo Add description of the param
 */
Account.prototype.verifyPublicKey = function(publicKey) {
	if (publicKey !== undefined) {
		// Check type
		if (typeof publicKey !== 'string') {
			throw 'Invalid public key, must be a string';
		}
		// Check length
		if (publicKey.length !== 64) {
			throw 'Invalid public key, must be 64 characters long';
		}

		if (!this.scope.schema.validate(publicKey, { format: 'hex' })) {
			throw 'Invalid public key, must be a hex string';
		}
	}
};

/**
 * Normalizes address and creates binary buffers to insert.
 *
 * @param {Object} raw - with address and public key
 * @returns {Object} Normalized address
 */
Account.prototype.toDB = function(raw) {
	this.binary.forEach(function(field) {
		if (raw[field]) {
			raw[field] = Buffer.from(raw[field], 'hex');
		}
	});

	// Normalize address
	raw.address = String(raw.address).toUpperCase();

	return raw;
};

/**
 * Gets Multisignature account information for specified fields and filter criteria.
 *
 * @param {Object} filter - Contains address
 * @param {Object|function} fields - Table fields
 * @param {function} cb - Callback function
 * @returns {Immediate} Returns null or Object with database data
 */
Account.prototype.getMultiSignature = function(filter, fields, cb, tx) {
	if (typeof fields === 'function') {
		tx = cb;
		cb = fields;
		fields = null;
	}

	filter.multisig = true;

	this.get(filter, fields, cb, tx);
};

/**
 * Gets account information for specified fields and filter criteria.
 *
 * @param {Object} filter - Contains address
 * @param {Object|function} fields - Table fields
 * @param {function} cb - Callback function
 * @returns {Immediate} Returns null or Object with database data
 */
Account.prototype.get = function(filter, fields, cb, tx) {
	if (typeof fields === 'function') {
		tx = cb;
		cb = fields;
		fields = null;
	}

	this.getAll(
		filter,
		fields,
		function(err, data) {
			return setImmediate(cb, err, data && data.length ? data[0] : null);
		},
		tx
	);
};

/**
 * Gets accounts information from mem_accounts.
 *
 * @param {Object} filter - Contains address
 * @param {Object|function} fields - Table fields
 * @param {function} cb - Callback function
 * @returns {Immediate} data with rows | 'Account#getAll error'
 */
Account.prototype.getAll = function(filter, fields, cb, tx) {
	if (typeof fields === 'function') {
		cb = fields;
		fields = null;
	}

	var computedFields = {
		approval: ['vote'],
		productivity: ['producedBlocks', 'missedBlocks', 'rank'],
	};

	// If fields are not provided append computed fields
	if (!fields) {
		fields = this.scope.db.accounts.getDBFields();
		fields = fields.concat(Object.keys(computedFields));
	}

	var fieldsAddedForComputation = [];
	var performComputationFor = [];

	Object.keys(computedFields).forEach(function(computedField) {
		if (fields.indexOf(computedField) !== -1) {
			// Add computed field to list to process later
			performComputationFor.push(computedField);

			// Remove computed field from the db fields list
			fields.splice(fields.indexOf(computedField), 1);

			// Marks fields which are explicitly added due to computation
			fieldsAddedForComputation = fieldsAddedForComputation.concat(
				_.difference(computedFields[computedField], fields)
			);

			// Add computation dependant fields to db fields list
			fields = fields.concat(computedFields[computedField]);
		}
	});

	var DEFAULT_LIMIT = constants.activeDelegates;
	var limit = DEFAULT_LIMIT;
	var offset = 0;
	var sort = { sortField: '', sortMethod: '' };

	if (filter.offset > 0) {
		offset = filter.offset;
	}
	delete filter.offset;

	if (filter.limit > 0) {
		limit = filter.limit;
	}
	delete filter.limit;

	if (filter.sort) {
		var allowedSortFields = [
			'username',
			'balance',
			'rank',
			'missedBlocks',
			'vote',
			'publicKey',
		];
		sort = sortBy.sortBy(filter.sort, {
			sortFields: allowedSortFields,
			quoteField: false,
		});
	}
	delete filter.sort;

	var self = this;

	(tx || this.scope.db).accounts
		.list(filter, fields, {
			limit: limit,
			offset: offset,
			sortField: sort.sortField,
			sortMethod: sort.sortMethod,
		})
		.then(function(rows) {
			var lastBlock = modules.blocks.lastBlock.get();
			// If the last block height is undefined, it means it's a genesis block with height = 1
			// look for a constant for total supply
			var totalSupply = lastBlock.height
				? __private.blockReward.calcSupply(lastBlock.height)
				: 0;

			if (performComputationFor.indexOf('approval') !== -1) {
				rows.forEach(function(accountRow) {
					accountRow.approval = self.calculateApproval(
						accountRow.vote,
						totalSupply
					);
				});
			}

			if (performComputationFor.indexOf('productivity') !== -1) {
				rows.forEach(function(accountRow) {
					accountRow.productivity = self.calculateProductivity(
						accountRow.producedBlocks,
						accountRow.missedBlocks
					);
				});
			}

			if (fieldsAddedForComputation.length > 0) {
				// Remove the fields which were only added for computation
				rows.forEach(function(accountRow) {
					fieldsAddedForComputation.forEach(function(field) {
						delete accountRow[field];
					});
				});
			}

			return setImmediate(cb, null, rows);
		})
		.catch(function(err) {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Account#getAll error');
		});
};

/**
 * Calculates productivity of a delegate account.
 *
 * @param {String} votersBalance - Description of the param
 * @param {String} totalSupply - Description of the param
 * @returns {Number}
 * @todo Add descriptions of the params and returns-value
 */
Account.prototype.calculateApproval = function(votersBalance, totalSupply) {
	// votersBalance and totalSupply are sent as strings, we convert them into bignum and send the response as number as well.
	var votersBalanceBignum = new Bignum(votersBalance || 0);
	var totalSupplyBignum = new Bignum(totalSupply);
	var approvalBignum = votersBalanceBignum
		.dividedBy(totalSupplyBignum)
		.times(100)
		.round(2);
	return !approvalBignum.isNaN() ? approvalBignum.toNumber() : 0;
};

/**
 * Calculates productivity of a delegate account.
 *
 * @param {String} producedBlocks - Description of the param
 * @param {String} missedBlocks - Description of the param
 * @returns {Number}
 * @todo Add descriptions of the params and returns-value
 */
Account.prototype.calculateProductivity = function(
	producedBlocks,
	missedBlocks
) {
	var producedBlocksBignum = new Bignum(producedBlocks || 0);
	var missedBlocksBignum = new Bignum(missedBlocks || 0);
	var percent = producedBlocksBignum
		.dividedBy(producedBlocksBignum.plus(missedBlocksBignum))
		.times(100)
		.round(2);
	return !percent.isNaN() ? percent.toNumber() : 0;
};

/**
 * Sets fields for specific address in mem_accounts table.
 *
 * @param {address} address - Description of the param
 * @param {Object} fields - Description of the param
 * @param {function} cb - Callback function
 * @returns {Immediate} cb | 'Account#set error'
 * @todo Add descriptions of the params and returns-value
 */
Account.prototype.set = function(address, fields, cb, tx) {
	// Verify public key
	this.verifyPublicKey(fields.publicKey);

	// Normalize address
	fields.address = address;

	(tx || this.scope.db).accounts
		.upsert(fields, ['address'])
		.then(function() {
			return setImmediate(cb);
		})
		.catch(function(err) {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Account#set error');
		});
};

/**
 * Updates account from mem_account with diff data belonging to an editable field.
 * Inserts into mem_round "address", "amount", "delegate", "blockId", "round" based on balance or delegates fields.
 *
 * @param {address} address - Description of the param
 * @param {Object} diff - Must contains only mem_account editable fields
 * @param {function} cb - Callback function
 * @returns {Immediate|cb|done} Multiple returns: done() or error
 * @todo Add descriptions of the params
 */
Account.prototype.merge = function(address, diff, cb, tx) {
	// Verify public key
	this.verifyPublicKey(diff.publicKey);

	// Normalize address
	address = String(address).toUpperCase();

	var self = this;

	// If merge was called without any diff object
	if (Object.keys(diff).length === 0) {
		return self.get({ address: address }, cb, tx);
	}

	// Loop through each of updated attribute
	(tx || self.scope.db)
		.tx('logic:account:merge', function(dbTx) {
			var promises = [];

			Object.keys(diff).forEach(function(updatedField) {
				// Return if updated field is not editable
				if (self.editable.indexOf(updatedField) === -1) {
					return;
				}

				// Get field data type
				var fieldType = self.conv[updatedField];
				var updatedValue = diff[updatedField];

				// Make execution selection based on field type
				switch (fieldType) {
					// blockId
					case String:
						promises.push(
							dbTx.accounts.update(address, _.pick(diff, [updatedField]))
						);
						break;

					// [u_]balance, [u_]multimin, [u_]multilifetime, rate, fees, rank, rewards, votes, producedBlocks, missedBlocks
					case Number:
						if (isNaN(updatedValue) || updatedValue === Infinity) {
							throw `Encountered insane number: ${updatedValue}`;
						}

						// If updated value is positive number
						if (Math.abs(updatedValue) === updatedValue && updatedValue !== 0) {
							promises.push(
								dbTx.accounts.increment(
									address,
									updatedField,
									Math.floor(updatedValue)
								)
							);

							// If updated value is negative number
						} else if (updatedValue < 0) {
							promises.push(
								dbTx.accounts.decrement(
									address,
									updatedField,
									Math.floor(Math.abs(updatedValue))
								)
							);

							// If money is taken out from an account so its an active account now.
							if (updatedField === 'u_balance') {
								promises.push(dbTx.accounts.update(address, { virgin: 0 }));
							}
						}

						if (updatedField === 'balance') {
							promises.push(
								dbTx.rounds.insertRoundInformationWithAmount(
									address,
									diff.blockId,
									diff.round,
									updatedValue
								)
							);
						}
						break;

					// [u_]delegates, [u_]multisignatures
					case Array:
						// If we received update as array of strings
						if (_.isString(updatedValue[0])) {
							updatedValue.forEach(function(updatedValueItem) {
								// Fetch first character
								var mode = updatedValueItem[0];
								var dependentId = '';

								if (mode === '-' || mode === '+') {
									dependentId = updatedValueItem.slice(1);
								} else {
									dependentId = updatedValueItem;
									mode = '+';
								}

								if (mode === '-') {
									promises.push(
										dbTx.accounts.removeDependencies(
											address,
											dependentId,
											updatedField
										)
									);
								} else {
									promises.push(
										dbTx.accounts.insertDependencies(
											address,
											dependentId,
											updatedField
										)
									);
								}

								if (updatedField === 'delegates') {
									promises.push(
										dbTx.rounds.insertRoundInformationWithDelegate(
											address,
											diff.blockId,
											diff.round,
											dependentId,
											mode
										)
									);
								}
							});
							// If we received update as array of objects
						} else if (_.isObject(updatedValue[0])) {
							// TODO: Need to look the usage of object based diff param
						}
						break;
				}
			});

			// Run all db operations in a batch
			return dbTx.batch(promises);
		})
		.then(function() {
			return self.get({ address: address }, cb, tx);
		})
		.catch(function(err) {
			library.logger.error(err.stack);
			return setImmediate(cb, _.isString(err) ? err : 'Account#merge error');
		});
};

/**
 * Removes an account from mem_account table based on address.
 *
 * @param {address} address - Description of the param
 * @param {function} cb - Callback function
 * @returns {Immediate} Data with address | Account#remove error
 * @todo Add descriptions of the params
 */
Account.prototype.remove = function(address, cb) {
	this.scope.db.accounts
		.remove(address)
		.then(function() {
			return setImmediate(cb, null, address);
		})
		.catch(function(err) {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Account#remove error');
		});
};

// Export
module.exports = Account;
