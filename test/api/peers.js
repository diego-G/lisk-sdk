'use strict'; /*jslint mocha:true, expr:true */

var node = require('./../node.js');

describe('GET /api/peers/version', function () {

	it('should be ok', function (done) {
		node.get('/api/peers/version', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('build').to.be.a('string');
			node.expect(res.body).to.have.property('version').to.be.a('string');
			done();
		});
	});
});

describe('GET /api/peers', function () {

	it('using invalid ip should fail', function (done) {
		var ip = 'invalid';
		var params = 'ip=' + ip;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Object didn\'t pass validation for format ip: invalid');
			done();
		});
	});

	it('using valid ip should be ok', function (done) {
		var ip = '0.0.0.0';
		var params = 'ip=' + ip;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done();
		});
	});

	it('using port < 1 should fail', function (done) {
		var port = 0;
		var params = 'port=' + port;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value 0 is less than minimum 1');
			done();
		});
	});

	it('using port == 65535 be ok', function (done) {
		var port = 65535;
		var params = 'port=' + port;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done();
		});
	});

	it('using port > 65535 should fail', function (done) {
		var port = 65536;
		var params = 'port=' + port;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value 65536 is greater than maximum 65535');
			done();
		});
	});

	it('using state == 0 should be ok', function (done) {
		var state = 0;
		var params = 'state=' + state;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('peers').that.is.an('array');
			if (res.body.peers.length > 0) {
				for (var i = 0; i < res.body.peers.length; i++) {
					 node.expect(res.body.peers[i].state).to.equal(parseInt(state));
				}
			}
			done();
		});
	});

	it('using state == 1 should be ok', function (done) {
		var state = 1;
		var params = 'state=' + state;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('peers').that.is.an('array');
			if (res.body.peers.length > 0) {
				for (var i = 0; i < res.body.peers.length; i++) {
					 node.expect(res.body.peers[i].state).to.equal(parseInt(state));
				}
			}
			done();
		});
	});

	it('using state == 2 should be ok', function (done) {
		var state = 2;
		var params = 'state=' + state;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('peers').that.is.an('array');
			if (res.body.peers.length > 0) {
				for (var i = 0; i < res.body.peers.length; i++) {
					 node.expect(res.body.peers[i].state).to.equal(parseInt(state));
				}
			}
			done();
		});
	});

	it('using state > 2 should fail', function (done) {
		var state = 3;
		var params = 'state=' + state;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value 3 is greater than maximum 2');
			done();
		});
	});

	it('using os with length == 1 should be ok', function (done) {
		var os = 'b';
		var params = 'os=' + os;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done();
		});
	});

	it('using os with length == 64 should be ok', function (done) {
		var os = 'battle-claw-lunch-confirm-correct-limb-siege-erode-child-libert';
		var params = 'os=' + os;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done();
		});
	});

	it('using os with length > 64 should be ok', function (done) {
		var os = 'battle-claw-lunch-confirm-correct-limb-siege-erode-child-liberty-';
		var params = 'os=' + os;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (65 chars), maximum 64');
			done();
		});
	});

	it('using version == "999.999.999" characters should be ok', function (done) {
		var version = '999.999.999';
		var params = 'version=' + version;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done();
		});
	});

	it('using version == "9999.999.999" characters should fail', function (done) {
		var version = '9999.999.999';
		var params = 'version=' + version;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Object didn\'t pass validation for format version: 9999.999.999');
			done();
		});
	});

	it('using version == "999.9999.999" characters should fail', function (done) {
		var version = '999.9999.999';
		var params = 'version=' + version;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Object didn\'t pass validation for format version: 999.9999.999');
			done();
		});
	});

	it('using version == "999.999.9999" characters should fail', function (done) {
		var version = '999.999.9999';
		var params = 'version=' + version;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Object didn\'t pass validation for format version: 999.999.9999');
			done();
		});
	});

	it('using version == "999.999.999a" characters should be ok', function (done) {
		var version = '999.999.999a';
		var params = 'version=' + version;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done();
		});
	});

	it('using version == "999.999.999ab" characters should fail', function (done) {
		var version = '999.999.999ab';
		var params = 'version=' + version;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Object didn\'t pass validation for format version: 999.999.999ab');
			done();
		});
	});

	it('using invalid broadhash should fail', function (done) {
		var broadhash = 'invalid';
		var params = 'broadhash=' + broadhash;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Object didn\'t pass validation for format hex: invalid');
			done();
		});
	});

	it('using valid broadhash should be ok', function (done) {
		var broadhash = node.config.nethash;
		var params = 'broadhash=' + broadhash;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done();
		});
	});

	it('using orderBy == "state:desc" should be ok', function (done) {
		var orderBy = 'state:desc';
		var params = 'orderBy=' + orderBy;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('peers').that.is.an('array');

			if (res.body.peers.length > 0) {
				for (var i = 0; i < res.body.peers.length; i++) {
					if (res.body.peers[i + 1] != null) {
						node.expect(res.body.peers[i + 1].state).to.be.at.most(res.body.peers[i].state);
					}
				}
			}

			done();
		});
	});

	it('using string limit should fail', function (done) {
		var limit = 'one';
		var params = 'limit=' + limit;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type integer but found type string');
			done();
		});
	});

	it('using limit == -1 should fail', function (done) {
		var limit = -1;
		var params = 'limit=' + limit;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value -1 is less than minimum 1');
			done();
		});
	});

	it('using limit == 0 should fail', function (done) {
		var limit = 0;
		var params = 'limit=' + limit;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value 0 is less than minimum 1');
			done();
		});
	});

	it('using limit == 1 should be ok', function (done) {
		var limit = 1;
		var params = 'limit=' + limit;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('peers').that.is.an('array');
			node.expect(res.body.peers.length).to.be.at.most(limit);
			done();
		});
	});

	it('using limit == 100 should be ok', function (done) {
		var limit = 100;
		var params = 'limit=' + limit;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('peers').that.is.an('array');
			node.expect(res.body.peers.length).to.be.at.most(limit);
			done();
		});
	});

	it('using limit > 100 should fail', function (done) {
		var limit = 101;
		var params = 'limit=' + limit;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value 101 is greater than maximum 100');
			done();
		});
	});

	it('using string offset should fail', function (done) {
		var offset = 'one';
		var params = 'offset=' + offset;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type integer but found type string');
			done();
		});
	});

	it('using offset == -1 should fail', function (done) {
		var offset = -1;
		var params = 'offset=' + offset;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value -1 is less than minimum 0');
			done();
		});
	});

	it('using offset == 1 should be ok', function (done) {
		var offset = 1;
		var params = 'offset=' + offset;

		node.get('/api/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done();
		});
	});
});

describe('GET /api/peers/get', function () {

	var validParams;

	before(function (done) {
		node.addPeers(1, function (err, headers) {
			validParams = headers;
			done();
		});
	});

	it('using known ip address with no port should fail', function (done) {
		node.get('/api/peers/get?ip=127.0.0.1', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: port');
			done();
		});
	});

	it('using valid port with no ip address should fail', function (done) {
		node.get('/api/peers/get?port=' + validParams.port, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: ip');
			done();
		});
	});

	it('using known ip address and port should be ok', function (done) {
		node.get('/api/peers/get?ip=127.0.0.1&port=' + validParams.port, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('peer').to.be.an('object');
			done();
		});
	});

	it('using unknown ip address and port should fail', function (done) {
		node.get('/api/peers/get?ip=0.0.0.0&port=' + validParams.port, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Peer not found');
			done();
		});
	});
});
