'use strict';

var async = require('async');
var constants = require('../helpers/constants.js');
var transactionTypes = require('../helpers/transactionTypes.js');

// Private fields
var modules, library, self, __private = {};

// Constructor
function TransactionPool (scope) {
	library = scope;
	self = this;

	self.unconfirmed = { transactions: [], index: {} };
	self.queued = { transactions: [], index: {} };
	self.multisignature = { transactions: [], index: {} };
	self.poolInterval = 30000;

	// Transaction pool timer
	setInterval(function () {
		async.series([
			self.expireTransactions
		], function (err) {
			if (err) {
				library.logger.log('Transaction pool timer', err);
			}
		});
	}, self.poolInterval);
}

// Public methods
TransactionPool.prototype.bind = function (scope) {
	modules = scope;
};

TransactionPool.prototype.transactionInPool = function (id) {
	return [
		self.unconfirmed.index[id],
		self.queued.index[id],
		self.multisignature.index[id]
	].filter(Boolean).length > 0;
};

TransactionPool.prototype.getUnconfirmedTransaction = function (id) {
	var index = self.unconfirmed.index[id];
	return self.unconfirmed.transactions[index];
};

TransactionPool.prototype.getQueuedTransaction = function (id) {
	var index = self.queued.index[id];
	return self.queued.transactions[index];
};

TransactionPool.prototype.getMultisignatureTransaction = function (id) {
	var index = self.multisignature.index[id];
	return self.multisignature.transactions[index];
};

TransactionPool.prototype.getUnconfirmedTransactionList = function (reverse, limit) {
	return __private.getTransactionList(self.unconfirmed.transactions, reverse, limit);
};

TransactionPool.prototype.getQueuedTransactionList  = function (reverse, limit) {
	return __private.getTransactionList(self.queued.transactions, reverse, limit);
};

TransactionPool.prototype.getMultisignatureTransactionList = function (reverse, ready, limit) {
	if (ready) {
		return __private.getTransactionList(self.multisignature.transactions, reverse).filter(function (transaction) {
			return transaction.ready;
		});
	} else {
		return __private.getTransactionList(self.multisignature.transactions, reverse, limit);
	}
};

TransactionPool.prototype.getMergedTransactionList = function (reverse, limit) {
	var minLimit = (constants.maxTxsPerBlock + 2);

	if (limit <= minLimit || limit > constants.maxSharedTxs) {
		limit = minLimit;
	}

	var unconfirmed = modules.transactions.getUnconfirmedTransactionList(false, constants.maxTxsPerBlock);
	limit -= unconfirmed.length;

	var multisignatures = modules.transactions.getMultisignatureTransactionList(false, constants.maxTxsPerBlock);
	limit -= multisignatures.length;

	var queued = modules.transactions.getQueuedTransactionList(false, limit);
	limit -= queued.length;

	return unconfirmed.concat(multisignatures).concat(queued);
};

TransactionPool.prototype.addUnconfirmedTransaction = function (transaction) {
	if (transaction.type === transactionTypes.MULTI || Array.isArray(transaction.signatures)) {
		self.removeMultisignatureTransaction(transaction.id);
	} else {
		self.removeQueuedTransaction(transaction.id);
	}

	if (self.unconfirmed.index[transaction.id] === undefined) {
		if (!transaction.receivedAt) {
			transaction.receivedAt = new Date();
		}

		self.unconfirmed.transactions.push(transaction);
		var index = self.unconfirmed.transactions.indexOf(transaction);
		self.unconfirmed.index[transaction.id] = index;
	}
};

TransactionPool.prototype.removeUnconfirmedTransaction = function (id) {
	var index = self.unconfirmed.index[id];

	if (index !== undefined) {
		self.unconfirmed.transactions[index] = false;
		delete self.unconfirmed.index[id];
	}

	self.removeQueuedTransaction(id);
	self.removeMultisignatureTransaction(id);
};

TransactionPool.prototype.countUnconfirmed = function () {
	return Object.keys(self.unconfirmed.index).length;
};

TransactionPool.prototype.addQueuedTransaction = function (transaction) {
	if (self.queued.index[transaction.id] === undefined) {
		if (!transaction.receivedAt) {
			transaction.receivedAt = new Date();
		}

		self.queued.transactions.push(transaction);
		var index = self.queued.transactions.indexOf(transaction);
		self.queued.index[transaction.id] = index;
	}
};

TransactionPool.prototype.removeQueuedTransaction = function (id) {
	var index = self.queued.index[id];

	if (index !== undefined) {
		self.queued.transactions[index] = false;
		delete self.queued.index[id];
	}
};

TransactionPool.prototype.countQueued = function () {
	return Object.keys(self.queued.index).length;
};

TransactionPool.prototype.addMultisignatureTransaction = function (transaction) {
	if (self.multisignature.index[transaction.id] === undefined) {
		if (!transaction.receivedAt) {
			transaction.receivedAt = new Date();
		}

		self.multisignature.transactions.push(transaction);
		var index = self.multisignature.transactions.indexOf(transaction);
		self.multisignature.index[transaction.id] = index;
	}
};

TransactionPool.prototype.removeMultisignatureTransaction = function (id) {
	var index = self.multisignature.index[id];

	if (index !== undefined) {
		self.multisignature.transactions[index] = false;
		delete self.multisignature.index[id];
	}
};

TransactionPool.prototype.countMultisignature= function () {
	return Object.keys(self.multisignature.index).length;
};

TransactionPool.prototype.receiveTransactions = function (transactions, broadcast, cb) {
	async.eachSeries(transactions, function (transaction, cb) {
		self.processUnconfirmedTransaction(transaction, broadcast, cb);
	}, function (err) {
		return setImmediate(cb, err, transactions);
	});
};

TransactionPool.prototype.processUnconfirmedTransaction = function (transaction, broadcast, cb) {
	if (self.transactionInPool(transaction.id)) {
		return setImmediate(cb, 'Transaction is already processed: ' + transaction.id);
	}

	__private.processVerifyTransaction(transaction, function (err) {
		if (err) {
			return setImmediate(cb, err);
		} else {
			delete transaction.receivedAt;

			if (transaction.type === transactionTypes.MULTI || Array.isArray(transaction.signatures)) {
				if (self.countMultisignature() >= constants.maxTxsPerQueue) {
					return setImmediate(cb, 'Transaction pool is full');
				} else {
					self.addMultisignatureTransaction(transaction);
				}
			} else {
				if (self.countQueued() >= constants.maxTxsPerQueue) {
					return setImmediate(cb, 'Transaction pool is full');
				} else {
					self.addQueuedTransaction(transaction);
				}
			}

			library.bus.message('unconfirmedTransaction', transaction, broadcast);
			return setImmediate(cb);
		}
	});
};

TransactionPool.prototype.applyUnconfirmedList = function (cb) {
	return __private.applyUnconfirmedList(self.getUnconfirmedTransactionList(true), cb);
};

TransactionPool.prototype.applyUnconfirmedIds = function (ids, cb) {
	return __private.applyUnconfirmedList(ids, cb);
};

TransactionPool.prototype.undoUnconfirmedList = function (cb) {
	var ids = [];

	async.eachSeries(self.getUnconfirmedTransactionList(false), function (transaction, eachSeriesCb) {
		if (transaction) {
			ids.push(transaction.id);
			modules.transactions.undoUnconfirmed(transaction, function (err) {
				if (err) {
					library.logger.error('Failed to undo unconfirmed transaction: ' + transaction.id, err);
					self.removeUnconfirmedTransaction(transaction.id);
				}
				return setImmediate(eachSeriesCb);
			});
		} else {
			return setImmediate(eachSeriesCb);
		}
	}, function (err) {
		return setImmediate(cb, err, ids);
	});
};

TransactionPool.prototype.expireTransactions = function (cb) {
	var ids = [];

	async.waterfall([
		function (seriesCb) {
			__private.expireTransactions(self.getUnconfirmedTransactionList(true), ids, seriesCb);
		},
		function (res, seriesCb) {
			__private.expireTransactions(self.getQueuedTransactionList(true), ids, seriesCb);
		},
		function (res, seriesCb) {
			__private.expireTransactions(self.getMultisignatureTransactionList(true), ids, seriesCb);
		}
	], function (err, ids) {
		return setImmediate(cb, err, ids);
	});
};

TransactionPool.prototype.fillPool = function (cb) {
	if (modules.loader.syncing()) { return setImmediate(cb); }

	var unconfirmedCount = self.countUnconfirmed();
	library.logger.debug('Transaction pool size: ' + unconfirmedCount);

	if (unconfirmedCount >= constants.maxTxsPerBlock) {
		return setImmediate(cb);
	} else {
		var spare = 0, spareMulti;
		var multisignatures;
		var multisignaturesLimit = 5;
		var transactions;

		spare = (constants.maxTxsPerBlock - unconfirmedCount);
		spareMulti = (spare >= multisignaturesLimit) ? multisignaturesLimit : 0;
		multisignatures = self.getMultisignatureTransactionList(true, true, multisignaturesLimit).slice(0, spareMulti);
		spare = Math.abs(spare - multisignatures.length);
		transactions = self.getQueuedTransactionList(true, constants.maxTxsPerBlock).slice(0, spare);
		transactions = multisignatures.concat(transactions);

		transactions.forEach(function (transaction)  {
			self.addUnconfirmedTransaction(transaction);
		});

		return __private.applyUnconfirmedList(transactions, cb);
	}
};

// Private
__private.getTransactionList = function (transactions, reverse, limit) {
	var a = [];

	for (var i = 0; i < transactions.length; i++) {
		var transaction = transactions[i];

		if (transaction !== false)	{
			a.push(transaction);
		}
	}

	a = reverse ? a.reverse() : a;

	if (limit) {
		a.splice(limit);
	}

	return a;
};

__private.processVerifyTransaction = function (transaction, cb) {
	if (!transaction) {
		return setImmediate(cb, 'Missing transaction');
	}

	async.waterfall([
		function setAccountAndGet (waterCb) {
			modules.accounts.setAccountAndGet({publicKey: transaction.senderPublicKey}, waterCb);
		},
		function getRequester (sender, waterCb) {
			var multisignatures = Array.isArray(sender.multisignatures) && sender.multisignatures.length;

			if (multisignatures) {
				transaction.signatures = transaction.signatures || [];
			}

			if (sender && transaction.requesterPublicKey && multisignatures) {
				modules.accounts.getAccount({publicKey: transaction.requesterPublicKey}, function (err, requester) {
					if (!requester) {
						return setImmediate(waterCb, 'Requester not found');
					} else {
						return setImmediate(waterCb, null, sender, requester);
					}
				});
			} else {
				return setImmediate(waterCb, null, sender, null);
			}
		},
		function processTransaction (sender, requester, waterCb) {
			library.logic.transaction.process(transaction, sender, requester, function (err) {
				if (err) {
					return setImmediate(waterCb, err);
				} else {
					return setImmediate(waterCb, null, sender);
				}
			});
		},
		function verifyTransaction (sender, waterCb) {
			library.logic.transaction.verify(transaction, sender, function (err) {
				if (err) {
					return setImmediate(waterCb, err);
				} else {
					return setImmediate(waterCb, null, sender);
				}
			});
		}
	], function (err, sender) {
		return setImmediate(cb, err, sender);
	});
};

__private.applyUnconfirmedList = function (transactions, cb) {
	async.eachSeries(transactions, function (transaction, eachSeriesCb) {
		if (typeof transaction === 'string') {
			transaction = self.getUnconfirmedTransaction(transaction);
		}
		if (!transaction) {
			return setImmediate(eachSeriesCb);
		}
		__private.processVerifyTransaction(transaction, function (err, sender) {
			if (err) {
				library.logger.error('Failed to process / verify unconfirmed transaction: ' + transaction.id, err);
				self.removeUnconfirmedTransaction(transaction.id);
				return setImmediate(eachSeriesCb);
			}
			modules.transactions.applyUnconfirmed(transaction, sender, function (err) {
				if (err) {
					library.logger.error('Failed to apply unconfirmed transaction: ' + transaction.id, err);
					self.removeUnconfirmedTransaction(transaction.id);
				}
				return setImmediate(eachSeriesCb);
			});
		});
	}, cb);
};

__private.transactionTimeOut = function (transaction) {
	if (transaction.type === transactionTypes.MULTI) {
		return (transaction.asset.multisignature.lifetime * 3600);
	} else if (Array.isArray(transaction.signatures)) {
		return (constants.unconfirmedTransactionTimeOut * 8);
	} else {
		return (constants.unconfirmedTransactionTimeOut);
	}
};

__private.expireTransactions = function (transactions, parentIds, cb) {
	var ids = [];

	async.eachSeries(transactions, function (transaction, eachSeriesCb) {
		if (!transaction) {
			return setImmediate(eachSeriesCb);
		}

		var timeNow = new Date();
		var timeOut = __private.transactionTimeOut(transaction);
		var seconds = Math.floor((timeNow.getTime() - transaction.receivedAt.getTime()) / 1000);

		if (seconds > timeOut) {
			ids.push(transaction.id);
			self.removeUnconfirmedTransaction(transaction.id);
			library.logger.info('Expired transaction: ' + transaction.id + ' received at: ' + transaction.receivedAt.toUTCString());
			return setImmediate(eachSeriesCb);
		} else {
			return setImmediate(eachSeriesCb);
		}
	}, function (err) {
		return setImmediate(cb, err, ids.concat(parentIds));
	});
};

// Export
module.exports = TransactionPool;
