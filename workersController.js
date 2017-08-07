'use strict';

var async = require('async');
var url = require('url');

var SlaveWAMPServer = require('wamp-socket-cluster/SlaveWAMPServer');

var Peer = require('./logic/peer');
var System = require('./modules/system');
var Handshake = require('./helpers/wsApi').middleware.Handshake;
var extractHeaders = require('./helpers/wsApi').extractHeaders;
var PeersUpdateRules = require('./api/ws/workers/peersUpdateRules');
var failureCodes = require('./api/ws/rpc/failureCodes');
var Logger = require('./logger');
var config = require('./config.json');

/**
 * Function is invoked by SocketCluster
 * @param {Worker} worker
 */
module.exports.run = function (worker) {

	var scServer = worker.getSCServer();

	async.auto({

		logger: function (cb) {
			cb(null, new Logger({echo: config.consoleLogLevel, errorLevel: config.fileLogLevel, filename: config.logFileName}));
		},

		slaveWAMPServer: ['logger', function (scope, cb) {
			new SlaveWAMPServer(worker, cb);
		}],

		config: ['slaveWAMPServer', function (scope, cb) {
			cb(null, scope.slaveWAMPServer.config);
		}],

		peersUpdateRules: ['slaveWAMPServer', function (scope, cb) {
			cb(null, new PeersUpdateRules(scope.slaveWAMPServer));
		}],

		registerRPCSlaveEndpoints: ['peersUpdateRules', function (scope, cb) {
			scope.slaveWAMPServer.reassignRPCSlaveEndpoints({
				updateMyself: scope.peersUpdateRules.external.update
			});
			cb();
		}],

		system: ['config', function (scope, cb) {
			new System(cb, {config: scope.config});
		}],

		handshake: ['system', function (scope, cb) {
			var handshake = Handshake(scope.system);

			scServer.addMiddleware(scServer.MIDDLEWARE_HANDSHAKE, function (req, next) {

				try {
					var headers = extractHeaders(req);
				} catch (invalidHeadersException) {
					return next(invalidHeadersException);
				}

				scope.slaveWAMPServer.sendToMaster('list', {query: {nonce: headers.nonce}}, headers.nonce, function (err, result) {
					//peer is already on list - no need to insert
					if (!err && result.peers.length && result.peers[0].state === Peer.STATE.CONNECTED) {
						return next('Peer is already on inserted and active.');
					}
					//insert
					handshake(headers, function (err, peer) {
						if (err) {
							scope.logger.debug('Handshake with peer: ' + peer.string + ' rejected: ' + err.message);
						} else {
							scope.logger.debug('Handshake with peer: ' + peer.string + ' success');
						}
						next(err);
					});
				});
			});
			return cb(null, handshake);
		}]
	},
	function (err, scope) {
		scServer.on('connection', function (socket) {
			scope.slaveWAMPServer.upgradeToWAMP(socket);
			socket.on('disconnect', removePeerConnection.bind(null, socket));
			socket.on('error', removePeerConnection.bind(null, socket));
			updatePeerConnection(socket, scope.peersUpdateRules.internal.insert, function (onUpdateError) {
				if (onUpdateError) {
					socket.disconnect(failureCodes.ON_INSERT_ERROR, onUpdateError);
					scope.logger.debug('Peer insert error: ' + onUpdateError);
				}
			});
		});

		function removePeerConnection (socket, code) {
			if (code === failureCodes.ON_INSERT_ERROR) {
				return;
			}
			scope.slaveWAMPServer.onSocketDisconnect(socket);
			updatePeerConnection(socket, scope.peersUpdateRules.internal.remove, function (onUpdateError) {
				if (onUpdateError) {
					scope.logger.error(onUpdateError.error);
				}
			});
		}

		function updatePeerConnection (socket, updateAction, cb) {
			try {
				var headers = extractHeaders(socket.request);
			} catch (ex) {
				return cb('Failed to extract peer headers');
			}
			updateAction(new Peer(headers).object(), socket.id, cb);
		}
	});
};

module.exports.path = __dirname + '/workersController.js';
