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

/* eslint-disable class-methods-use-this */

const { EventEmitter } = require('events');
const { ImplementationPendingError } = require('../errors');

class BaseAdapter extends EventEmitter {
	/**
	 * Constructor for the adapter
	 * @param {Object} options
	 * @param {string} options.engineName
	 * @param {Boolean} options.inTest
	 */
	constructor(options) {
		super();
		this.engineName = options.engineName;
		this.inTest = options.inTest;
	}

	connect() {
		throw new ImplementationPendingError();
	}

	disconnect() {
		throw new ImplementationPendingError();
	}

	execute() {
		throw new ImplementationPendingError();
	}

	transaction() {
		throw new ImplementationPendingError();
	}

	task() {
		throw new ImplementationPendingError();
	}

	executeFile() {
		throw new ImplementationPendingError();
	}

	loadSQLFile() {
		throw new ImplementationPendingError();
	}

	parseQueryComponent() {
		throw new ImplementationPendingError();
	}
}

module.exports = BaseAdapter;
