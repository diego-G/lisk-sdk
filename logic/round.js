'use strict';

var pgp = require('pg-promise');
var RoundChanges = require('../helpers/RoundChanges.js');
var sql = require('../sql/rounds.js');

// Constructor
function Round (scope, t) {
	this.scope = scope;
	this.scope.outsiders = this.scope.outsiders || [];
	this.t = t;
}

// Public methods
Round.prototype.mergeBlockGenerator = function () {
	return this.t.none(
		this.scope.modules.accounts.mergeAccountAndGet({
			publicKey: this.scope.block.generatorPublicKey,
			producedblocks: (this.scope.backwards ? -1 : 1),
			blockId: this.scope.block.id,
			round: this.scope.round
		})
	);
};

Round.prototype.updateMissedBlocks = function () {
	if (this.scope.outsiders.length === 0) {
		return this.t;
	}

	return this.t.none(sql.updateMissedBlocks(this.scope.backwards), [this.scope.outsiders]);
};

Round.prototype.getVotes = function () {
	return this.t.query(sql.getVotes, { round: this.scope.round });
};

Round.prototype.updateVotes = function () {
	var self = this;

	return self.getVotes(self.scope.round).then(function (votes) {
		var queries = votes.map(function (vote) {
			return pgp.as.format(sql.updateVotes, {
				address: self.scope.modules.accounts.generateAddressByPublicKey(vote.delegate),
				amount: Math.floor(vote.amount)
			});
		}).join('');

		if (queries.length > 0) {
			return self.t.none(queries);
		} else {
			return self.t;
		}
	});
};

Round.prototype.markBlockId = function () {
	if (this.scope.backwards) {
		return this.t.none(sql.updateBlockId, { oldId: this.scope.block.id, newId: '0' });
	} else {
		return this.t;
	}
};

Round.prototype.flushRound = function () {
	return this.t.none(sql.flush, { round: this.scope.round });
};

Round.prototype.truncateBlocks = function () {
	return this.t.none(sql.truncateBlocks, { height: this.scope.block.height });
};

Round.prototype.applyRound = function () {
	var roundChanges = new RoundChanges(this.scope);
	var queries = [];

	for (var i = 0; i < this.scope.delegates.length; i++) {
		var delegate = this.scope.delegates[i];
		var changes = roundChanges.at(i);

		console.log('Round changes', delegate, changes);

		queries.push(this.scope.modules.accounts.mergeAccountAndGet({
			publicKey: delegate,
			balance: (this.scope.backwards ? -changes.balance : changes.balance),
			u_balance: (this.scope.backwards ? -changes.balance : changes.balance),
			blockId: this.scope.block.id,
			round: this.scope.round,
			fees: (this.scope.backwards ? -changes.fees : changes.fees),
			rewards: (this.scope.backwards ? -changes.rewards : changes.rewards)
		}));

		if (i === this.scope.delegates.length - 1) {
			queries.push(this.scope.modules.accounts.mergeAccountAndGet({
				publicKey: delegate,
				balance: (this.scope.backwards ? -changes.feesRemaining : changes.feesRemaining),
				u_balance: (this.scope.backwards ? -changes.feesRemaining : changes.feesRemaining),
				blockId: this.scope.block.id,
				round: this.scope.round,
				fees: (this.scope.backwards ? -changes.feesRemaining : changes.feesRemaining)
			}));
		}
	}

	console.log('Applying round', queries);

	return this.t.none(queries.join(''));
};

Round.prototype.land = function () {
	return this.updateVotes()
		.then(this.updateMissedBlocks.bind(this))
		.then(this.flushRound.bind(this))
		.then(this.applyRound.bind(this))
		.then(this.updateVotes.bind(this))
		.then(this.flushRound.bind(this))
		.then(function () {
			return this.t;
		}.bind(this));
};

// Export
module.exports = Round;
