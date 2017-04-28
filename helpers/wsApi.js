'use strict';

var checkIpInList = require('./checkIpInList');
var Z_schema = require('../helpers/z_schema.js');
var schema = require('../schema/transport.js');
var Peer = require('../logic/peer.js');

var z_schema = new Z_schema();

var middleware = {

	Handshake: function (system) {
		return function (headers, cb) {

			var peer = new Peer({
				ip: headers.ip,
				port: headers.port,
				nonce: headers.nonce
			});

			z_schema.validate(headers, schema.headers, function (error) {
				if (error) {
					return setImmediate(cb, {
						success: false,
						error: error,
						code: 'EHEADERS'
					}, peer);
				}

				headers = peer.applyHeaders(headers);

				if (!system.nonceCompatible(headers.nonce)) {
					return setImmediate(cb, {
						success: false,
						message: 'Request is made by itself',
						expected: 'different than ' + system.getNonce(),
						received: headers.nonce,
						code: 'ENONCE'
					}, peer);
				}

				if (!system.networkCompatible(headers.nethash)) {
					return setImmediate(cb, {
						success: false,
						message: 'Request is made on the wrong network',
						expected: system.getNethash(),
						received: headers.nethash,
						code: 'ENETHASH'
					}, peer);
				}

				if (!system.versionCompatible(headers.version)) {
					return setImmediate(cb, {
						success: false,
						message: 'Request is made from incompatible version',
						expected: system.getMinVersion(),
						received: headers.version,
						peer: peer,
						code: 'EVERSION'
					}, peer);
				}

				return setImmediate(cb, null, peer);
			});
		};
	}
};

module.exports = {
	middleware: middleware
};
