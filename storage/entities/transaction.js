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

const _ = require('lodash');
const { stringToByte } = require('../utils/inputSerializers');
const ft = require('../utils/filter_types');
const BaseEntity = require('./base_entity');

/**
 * Basic Transaction
 * @typedef {Object} BasicTransaction
 * @property {string} id
 * @property {string} blockId
 * @property {Integer} [blockHeight]
 * @property {Integer} [confirmations]
 * @property {Integer} type
 * @property {Number} timestamp
 * @property {string} senderPublicKey
 * @property {string} requesterPublicKey
 * @property {string} senderId
 * @property {string} recipientId
 * @property {string} amount
 * @property {string} fee
 * @property {string} signature
 * @property {string} signSignature
 * @property {Array.<string>} signatures
 */

/**
 * Transfer Transaction
 * @typedef {BasicTransaction} TransferTransaction
 * @property {Object} asset
 * @property {string} asset.data
 */

/**
 * Second Passphrase Transaction
 * @typedef {BasicTransaction} SecondPassphraseTransaction
 * @property {Object} asset
 * @property {Object} asset.signature
 * @property {string} asset.signature.publicKey
 */

/**
 * Delegate Transaction
 * @typedef {BasicTransaction} DelegateTransaction
 * @property {Object} asset
 * @property {Object} asset.delegate
 * @property {string} asset.delegate.username
 */

/**
 * Vote Transaction
 * @typedef {BasicTransaction} VoteTransaction
 * @property {Object} asset
 * @property {Array.<string>} asset.votes
 */

/**
 * Multisig Registration Transaction
 * @typedef {BasicTransaction} MultisigRegistrationTransaction
 * @property {Object} asset
 * @property {Object} asset.multisignature
 * @property {Integer} asset.multisignature.min
 * @property {Integer} asset.multisignature.lifetime
 * @property {Array.<string>} asset.multisignature.keysgroup
 */

/**
 * Dapp Registration Transaction
 * @typedef {BasicTransaction} DappRegistrationTransaction
 * @property {Object} asset
 * @property {Object} asset.dapp
 * @property {Integer} asset.dapp.type
 * @property {string} asset.dapp.name
 * @property {string} asset.dapp.description
 * @property {string} asset.dapp.tags
 * @property {text} asset.dapp.link
 * @property {text} asset.dapp.icon
 * @property {Integer} asset.dapp.category
 */

/**
 * InTransfer Transaction
 * @typedef {BasicTransaction} InTransferTransaction
 * @property {Object} asset
 * @property {Object} asset.inTransfer
 * @property {string} asset.inTransfer.dappId
 */

/**
 * OutTransfer Transaction
 * @typedef {BasicTransaction} OutTransferTransaction
 * @property {Object} asset
 * @property {Object} asset.outTransfer
 * @property {string} asset.outTransfer.dappId
 * @property {string} asset.outTransfer.transactionId
 */

/**
 * Transaction
 * @typedef {(TransferTransaction|SecondPassphraseTransaction|DelegateTransaction|VoteTransaction|MultisigRegistrationTransaction|DappRegistrationTransaction|InTransferTransaction|OutTransferTransaction)} Transaction
 */

/**
 * Transaction Filters
 * @typedef {Object} filters.Transaction
 */

class Transaction extends BaseEntity {
	/**
	 * Constructor
	 * @param {BaseAdapter} adapter - Adapter to retrive the data from
	 * @param {filters.Transaction} defaultFilters - Set of default filters applied on every query
	 */
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.addField('id', 'string', { filter: ft.TEXT, fieldName: 't_id' });
		this.addField('blockId', 'string', {
			filter: ft.TEXT,
			fieldName: 't_blockId',
		});
		this.addField('blockHeight', 'string', {
			filter: ft.NUMBER,
			fieldName: 'b_height',
		});
		this.addField('type', 'number', { filter: ft.NUMBER, fieldName: 't_type' });
		this.addField('timestamp', 'number', {
			filter: ft.NUMBER,
			fieldName: 't_timestamp',
		});
		this.addField(
			'senderPublicKey',
			'string',
			{
				filter: ft.NUMBER,
				format: 'publicKey',
				fieldName: 't_senderPublicKey',
			},
			stringToByte
		);
		this.addField(
			'requesterPublicKey',
			'string',
			{
				filter: ft.NUMBER,
				format: 'publicKey',
				fieldName: 'm_recipientPublicKey',
			},
			stringToByte
		);
		this.addField('senderId', 'string', {
			filter: ft.TEXT,
			fieldName: 't_senderId',
		});
		this.addField('recipientId', 'string', {
			filter: ft.TEXT,
			fieldName: 't_recipientId',
		});
		this.addField('amount', 'string', {
			filter: ft.NUMBER,
			fieldName: 't_amount',
		});
		this.addField('fee', 'string', { filter: ft.NUMBER, fieldName: 't_fee' });
		this.addField('signature', 'string', { fieldName: 't_signature' });
		this.addField('signSignature', 'string', { fieldName: 't_SignSignature' });

		this.SQLs = {
			select: this.adapter.loadSQLFile('transactions/get.sql'),
			selectExtended: this.adapter.loadSQLFile('transactions/get_extended.sql'),
		};
	}

	/**
	 * Get one transaction
	 *
	 * @param {filters.Transaction|filters.Transaction[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Boolean} [options.extended=false] - Get extended fields for entity
	 * @param {Object} tx - Database transaction object
	 * @return {Promise.<Transaction, Error>}
	 */
	getOne(filters, options = {}, tx) {
		const expectedResultCount = 1;
		return this._getResults(filters, options, tx, expectedResultCount);
	}

	/**
	 * Get list of transactions
	 *
	 * @param {filters.Transaction|filters.Transaction[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Boolean} [options.extended=false] - Get extended fields for entity
	 * @param {Object} tx - Database transaction object
	 * @return {Promise.<Transaction[], Error>}
	 */
	get(filters, options = {}, tx) {
		return this._getResults(filters, options, tx);
	}

	_getResults(filters, options, tx, expectedResultCount = undefined) {
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const parsedOptions = _.defaults(
			{},
			_.pick(options, ['limit', 'offset', 'extended']),
			_.pick(this.defaultOptions, ['limit', 'offset', 'extended'])
		);

		const params = {
			limit: parsedOptions.limit,
			offset: parsedOptions.offset,
			parsedFilters,
		};

		return this.adapter.executeFile(
			parsedOptions.extended ? this.SQLs.selectExtended : this.SQLs.select,
			params,
			{ expectedResultCount },
			tx
		);
	}
}

module.exports = Transaction;
