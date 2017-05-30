var async = require('async');
var transactionTypes = require('../helpers/transactionTypes.js');
var client, self, logger, cacheEnabled, errorCacheDisabled = 'Cache Unavailable';

// Constructor
function Cache (cb, scope) {
	self = this;
	client = scope.cache.client;
	logger = scope.logger;
	cacheEnabled = scope.cache.cacheEnabled;
	setImmediate(cb, null, self);
}

/**
 * This function will be triggered on new block, it will clear all cache entires.
 */

Cache.prototype.onNewBlock = function () {
	self.removeByPattern('/api/blocks*', function (err) {
		if (err) {
			logger.error('Error clearing cache on new block');
		} else {
			logger.info('blocks api cache cleared on new block');
		}
	});
	self.removeByPattern('/api/transactions*', function (err) {
		if (err) {
			logger.error('Error clearing cache on new block');
		} else {
			logger.info('blocks api cache cleared on new block');
		}
	});
};

/**
 * This function will be triggered when a round finishes, it will clear all cache entires.
 */

Cache.prototype.onFinishRound = function () {
	self.removeByPattern('/api/delegates*', function (err) {
		if (err) {
			logger.error('Error clearing cache on round finish');
		} else {
			logger.info('Cache cleared on new Round');
		}
	});
};


/**
 * This function will be triggered when transactions are processed, it will clear all cache entires if there is a delegate type transaction.
 * @param {transactions} transactions
 */
Cache.prototype.onUnconfirmedTransaction = function (transactions) {
	if(Array.isArray(transactions)) {
		transactions = transactions;
	} else {
		transactions = [transactions];
	}
	var delgateTransactions = transactions.filter(function (trs) {
		return trs.type === transactionTypes.DELEGATE;
	});
	if (delgateTransactions.length > 0) {
		self.removeByPattern('/api/delegates*', function (err) {
			if (err) {
				logger.error('Error clearing cache on delegate trs');
			} else {
				logger.info('Cache flushed on delegate trs');
			}
		});
	}
};

Cache.prototype.cleanup = function () {
	self.quit();
};

Cache.prototype.getJsonForKey = function (key, cb) {
	// we can use config var to check if caching is activated
	if (self.isConnected()) {
		client.get(key, function (err, value) {
			// parsing string to json
			cb(err, JSON.parse(value));
		});
	} else {
		cb(errorCacheDisabled);
	}
};

Cache.prototype.setJsonForKey = function (key, value, cb) {
	if (self.isConnected()) {
		// redis calls toString on objects, which converts it to object [object] so calling stringify before saving
		client.set(key, JSON.stringify(value), cb);
	} else {
		cb(errorCacheDisabled);
	}
};

Cache.prototype.deleteJsonForKey = function (key, cb) {
	if (self.isConnected()) {
		client.del(key, cb);
	} else {
		cb(errorCacheDisabled);
	}
};

Cache.prototype.isConnected = function () {
	return cacheEnabled && client.connected;
};

Cache.prototype.removeByPattern = function (pattern, cb) {
	if (self.isConnected()) {
		var keys, cursor = 0;
		async.doWhilst(function iteratee (callback) {
			client.scan(cursor, 'MATCH', pattern, function (err, res) {
				if (err) {
					cb(err);
				} else {
					cursor = Number(res.shift());
					keys = res.shift();
					if (keys.length > 0 ) {
						client.del(keys, callback);
					} else {
						callback();
					}
				}
			});
		}, function test () {
			return cursor > 0;
		}, cb);
	} else {
		cb(errorCacheDisabled);
	}
};

Cache.prototype.flushDb = function (cb) {
	if (self.isConnected()) {
		client.flushdb(cb);
	} else {
		cb(errorCacheDisabled);
	}
};

Cache.prototype.quit = function () {
	if (self.isConnected()) {
		client.quit();
	}
};

module.exports = Cache;
