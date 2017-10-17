'use strict';

var constants = require('../helpers/constants.js');

module.exports = {
	getBlocks: {
		id: 'blocks.getBlocks',
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			},
			generatorPublicKey: {
				type: 'string',
				format: 'publicKey'
			},
			height: {
				type: 'integer',
				minimum: 1
			},
			limit: {
				type: 'integer',
				minimum: 1,
				maximum: 100
			},
			offset: {
				type: 'integer',
				minimum: 0
			},
			orderBy: {
				type: 'string'
			}
		}
	},
	getCommonBlock: {
		id: 'blocks.getCommonBlock',
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			},
			previousBlock: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20
			},
			height: {
				type: 'integer',
				minimum: 1
			}
		},
		required: ['id', 'previousBlock', 'height']
	}
};
