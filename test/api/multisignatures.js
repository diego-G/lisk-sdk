'use strict'; /*jslint mocha:true, expr:true */

var async = require('async');
var node = require('./../node.js');

var totalMembers = node.randomNumber(2, 16);
var requiredSignatures = node.randomNumber(2, totalMembers + 1);

var noLISKAccount = node.randomAccount();
var multisigAccount = node.randomAccount();

var accounts = [];
for (var i = 0; i < totalMembers; i++) {
	accounts[i] = node.randomAccount();
}

var multiSigTx = {
	lifetime: 0,
	min: 0,
	members: [],
	txId: ''
};

function sendLISK (account, i, done) {
	var randomLISK = node.randomLISK();

	node.put('/transactions', {
		secret: node.gAccount.password,
		amount: randomLISK,
		recipientId: account.address
	}, function (err, res) {
		node.expect(res.body).to.have.property('success').to.be.ok;
		if (res.body.success && i != null) {
			accounts[i].balance = randomLISK / node.normalizer;
		}
		done();
	});
}

function sendLISKfrommultisigAccount (amount, recipient, done) {
	node.put('/transactions', {
		secret: multisigAccount.password,
		amount: amount,
		recipientId: recipient
	}, function (err, res) {
		node.expect(res.body).to.have.property('success').to.be.ok;
		node.expect(res.body).to.have.property('transactionId');
		done(err, res.body.transactionId);
	});
}

function confirmTransaction (transactionId, passphrases, done) {
	var count = 0;

	async.until(
		function () {
			return (count >= passphrases.length);
		},
		function (untilCb) {
			var passphrase = passphrases[count];

			node.post('/multisignatures/sign', {
				secret: passphrase,
				transactionId: transactionId
			}, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transactionId').to.equal(transactionId);
				count++;
				return untilCb();
			});
		},
		function (err) {
			done(err);
		}
	);
}

// Used for KeysGroup
var Keys;

function makeKeysGroup () {
	var keysgroup = [];
	for (var i = 0; i < totalMembers; i++) {
		var member = '+' + accounts[i].publicKey;
		keysgroup.push(member);
	}
	return keysgroup;
}

before(function (done) {
	var i = 0;
	async.eachSeries(accounts, function (account, eachCb) {
		sendLISK(account, i, function () {
			i++;
			return eachCb();
		});
	}, function (err) {
		return done(err);
	});
});

before(function (done) {
	sendLISK(multisigAccount, null, done);
});

before(function (done) {
	node.onNewBlock(function (err) {
		done(err);
	});
});

describe('PUT /multisignatures', function () {

	before(function (done) {
		Keys = makeKeysGroup();
		done();
	});

	it('when owner\'s public key in keysgroup should fail', function (done) {
		node.put('/multisignatures', {
			secret: accounts[accounts.length-1].password,
			lifetime: 1,
			min: requiredSignatures,
			keysgroup: Keys
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when account has 0 LISK should fail', function (done) {
		node.put('/multisignatures', {
			secret: noLISKAccount.password,
			lifetime: 1,
			min: requiredSignatures,
			keysgroup: Keys
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when keysgroup is empty should fail', function (done) {
		var emptyKeys = [];

		node.put('/multisignatures', {
			secret: multisigAccount.password,
			lifetime: 1,
			min: requiredSignatures,
			keysgroup: emptyKeys
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when no keygroup is given should fail', function (done) {
		node.put('/multisignatures', {
			secret: multisigAccount.password,
			lifetime: 1,
			min: requiredSignatures
		}, function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('when keysgroup is a string should fail', function (done) {
		node.put('/multisignatures', {
			secret: multisigAccount.password,
			lifetime: 1,
			min: requiredSignatures,
			keysgroup: 'invalid'
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when no passphase is given should fail', function (done) {
		node.put('/multisignatures', {
			lifetime: 1,
			min: requiredSignatures,
			keysgroup: Keys
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when an invalid passphrase is given should fail', function (done) {
		node.put('/multisignatures', {
			secret: multisigAccount.password + 'inv4lid',
			lifetime: 1,
			min: requiredSignatures,
			keysgroup: Keys
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when no lifetime is given should fail', function (done) {
		node.put('/multisignatures', {
			secret: multisigAccount.password,
			min: requiredSignatures,
			keysgroup: Keys
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when lifetime is a string should fail', function (done) {
		node.put('/multisignatures', {
			secret: multisigAccount.password,
			lifetime: 'invalid',
			min: requiredSignatures,
			keysgroup: Keys
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when lifetime is greater than the maximum allowed should fail', function (done) {
		node.put('/multisignatures', {
			secret: multisigAccount.password,
			lifetime: 73,
			min: requiredSignatures,
			keysgroup: Keys
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when lifetime is zero should fail', function (done) {
		node.put('/multisignatures', {
			secret: multisigAccount.password,
			lifetime: 0,
			min: requiredSignatures,
			keysgroup: Keys
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when lifetime is negative should fail', function (done) {
		node.put('/multisignatures', {
			secret: multisigAccount.password,
			lifetime: -1,
			min: requiredSignatures,
			keysgroup: Keys
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when no min is given should fail', function (done) {
		node.put('/multisignatures', {
			secret: multisigAccount.password,
			lifetime: 1,
			keysgroup: Keys
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when min is a string should fail', function (done) {
		node.put('/multisignatures', {
			secret: multisigAccount.password,
			lifetime: 1,
			min: 'invalid',
			keysgroup: Keys
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when min is greater than the total members should fail', function (done) {
		node.put('/multisignatures', {
			secret: multisigAccount.password,
			lifetime: 1,
			min: totalMembers + 5,
			keysgroup: Keys
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when min is zero should fail', function (done) {
		node.put('/multisignatures', {
			secret: multisigAccount.password,
			lifetime: 1,
			min: 0,
			keysgroup: Keys
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when min is negative should fail', function (done) {
		var minimum = -1 * requiredSignatures;

		node.put('/multisignatures', {
			secret: multisigAccount.password,
			lifetime: 1,
			min: minimum,
			keysgroup: Keys
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when data is valid should be ok', function (done) {
		var lifetime = parseInt(node.randomNumber(1,72));

		node.put('/multisignatures', {
			secret: multisigAccount.password,
			lifetime: lifetime,
			min: requiredSignatures,
			keysgroup: Keys
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId');
			if (res.body.success && res.body.transactionId) {
				multiSigTx.txId = res.body.transactionId;
				multiSigTx.lifetime = lifetime;
				multiSigTx.members = Keys;
				multiSigTx.min = requiredSignatures;
			}
			done();
		});
	});
});

describe('GET /multisignatures/pending', function () {

	it('using invalid public key should fail', function (done) {
		var publicKey = 1234;

		node.get('/multisignatures/pending?publicKey=' + publicKey, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using no public key should be ok', function (done) {
		node.get('/multisignatures/pending?publicKey=', function (err, res) {
			node.expect(res.body).to.have.property('success');
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			node.expect(res.body.transactions.length).to.equal(0);
			done();
		});
	});

	it('using valid public key should be ok', function (done) {
		node.onNewBlock(function (err) {
			node.get('/multisignatures/pending?publicKey=' + multisigAccount.publicKey, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transactions').that.is.an('array');
				node.expect(res.body.transactions.length).to.be.at.least(1);
				var flag = 0;
				for (var i = 0; i < res.body.transactions.length; i++) {
					if (res.body.transactions[i].transaction.senderPublicKey === multisigAccount.publicKey) {
						flag += 1;
						node.expect(res.body.transactions[i].transaction).to.have.property('type').to.equal(node.txTypes.MULTI);
						node.expect(res.body.transactions[i].transaction).to.have.property('amount').to.equal(0);
						node.expect(res.body.transactions[i].transaction).to.have.property('asset').that.is.an('object');
						node.expect(res.body.transactions[i].transaction).to.have.property('fee').to.equal(node.fees.multisignatureRegistrationFee * (Keys.length + 1));
						node.expect(res.body.transactions[i].transaction).to.have.property('id').to.equal(multiSigTx.txId);
						node.expect(res.body.transactions[i].transaction).to.have.property('senderPublicKey').to.equal(multisigAccount.publicKey);
						node.expect(res.body.transactions[i]).to.have.property('lifetime').to.equal(multiSigTx.lifetime);
						node.expect(res.body.transactions[i]).to.have.property('min').to.equal(multiSigTx.min);
					}
				}
				node.expect(flag).to.equal(1);
				node.onNewBlock(function (err) {
					done();
				});
			});
		});
	});
});

describe('PUT /api/transactions', function () {

	it('when group transaction is pending should be ok', function (done) {
		sendLISKfrommultisigAccount(100000000, node.gAccount.address, function (err, transactionId) {
			node.onNewBlock(function (err) {
				node.get('/transactions/get?id=' + transactionId, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transaction');
					node.expect(res.body.transaction).to.have.property('id').to.equal(transactionId);
					done();
				});
			});
		});
	});
});

describe('POST /multisignatures/sign (group)', function () {

	it('using random passphrase should fail', function (done) {
		var account = node.randomAccount();

		node.post('/multisignatures/sign', {
			secret: account.password,
			transactionId: multiSigTx.txId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			done();
		});
	});

	it('using null passphrase should fail', function (done) {
		node.post('/multisignatures/sign', {
			secret: null,
			transactionId: multiSigTx.txId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			done();
		});
	});

	it('using undefined passphrase should fail', function (done) {
		node.post('/multisignatures/sign', {
			secret: undefined,
			transactionId: multiSigTx.txId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			done();
		});
	});

	it('using one less than total signatures should not confirm transaction', function (done) {
		var passphrases = accounts.map(function (account) {
			return account.password;
		});

		confirmTransaction(multiSigTx.txId, passphrases.slice(0, (passphrases.length - 1)), function () {
			node.onNewBlock(function (err) {
				node.get('/transactions/get?id=' + multiSigTx.txId, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
			});
		});
	});

	it('using one more signature should confirm transaction', function (done) {
		var passphrases = accounts.map(function (account) {
			return account.password;
		});

		confirmTransaction(multiSigTx.txId, passphrases.slice(-1), function () {
			node.onNewBlock(function (err) {
				node.get('/transactions/get?id=' + multiSigTx.txId, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transaction');
					node.expect(res.body.transaction).to.have.property('id').to.equal(multiSigTx.txId);
					done();
				});
			});
		});
	});
});

describe('POST /multisignatures/sign (transaction)', function () {

	before(function (done) {
		sendLISKfrommultisigAccount(100000000, node.gAccount.address, function (err, transactionId) {
			multiSigTx.txId = transactionId;
			done();
		});
	});

	it('using one less than minimum signatures should not confirm transaction', function (done) {
		var passphrases = accounts.map(function (account) {
			return account.password;
		});

		confirmTransaction(multiSigTx.txId, passphrases.slice(0, (multiSigTx.min - 1)), function () {
			node.onNewBlock(function (err) {
				node.get('/transactions/get?id=' + multiSigTx.txId, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
			});
		});
	});

	it('using one more signature should confirm transaction', function (done) {
		var passphrases = accounts.map(function (account) {
			return account.password;
		});

		confirmTransaction(multiSigTx.txId, passphrases.slice(-1), function () {
			node.onNewBlock(function (err) {
				node.get('/transactions/get?id=' + multiSigTx.txId, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transaction');
					node.expect(res.body.transaction).to.have.property('id').to.equal(multiSigTx.txId);
					done();
				});
			});
		});
	});
});
