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

var debug = require('debug')('swagger:lisk:cors');
var _ = require('lodash');
var CORS = require('cors');

/**
 * Description of the module.
 * @module
 * @requires debug
 * @requires lodash
 * @requires cors
 * @todo: add description of the module
 */

/**
 * Description of the function.
 * @func create
 * @param {Object} fittingDef - Description of the param.
 * @param {Object} bagpipes - Description of the param.
 * @returns {function} lisk_cors
 * @todo: add description of the function and its parameters
 */
module.exports = function create (fittingDef, bagpipes) {

	debug('config: %j', fittingDef);

	var validCorsOptions = ['origin', 'methods', 'allowedHeaders'];
	var middleware = CORS(_.pick(fittingDef, validCorsOptions));

	/**
	 * Description of the function.
	 * @func lisk_cors
	 * @param {Object} context - Description of the param.
	 * @param {function} cb - Description of the param.
	 * @todo: add description of the function and its parameters
	 */
	return function lisk_cors (context, cb) {
		debug('exec');
		middleware(context.request, context.response, cb);
	};
};
