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

const debug = require('debug')('lisk:validator:env');
const formatters = require('../formatters');
const metaSchema = require('./meta_schema');

const compile = (schema, parentSchema) => {
	debug('compile: schema: %j', schema);
	debug('compile: parent schema: %j', parentSchema);

	const envVariable =
		typeof schema === 'string'
			? {
					name: schema,
					formatter: null,
			  }
			: {
					name: schema.variable,
					formatter: formatters[schema.formatter] || null,
			  };

	return function(data, dataPath, object, key) {
		const variableValue = process.env[envVariable.name];

		if (variableValue) {
			object[key] = envVariable.formatter
				? envVariable.formatter(variableValue)
				: variableValue;
		}
	};
};

const envKeyword = {
	compile,
	errors: false,
	modifying: true,
	valid: true,
	metaSchema,
};

module.exports = envKeyword;
