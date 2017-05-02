'use strict';

var Q = require('q');
var _ = require('lodash');
var scClient = require('socketcluster-client');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');
var constants = require('../helpers/constants');

function WsRPCServer (socketCluster, childProcessConfig) {

	WsRPCServer.prototype.server = new MasterWAMPServer(socketCluster, childProcessConfig);
	console.log('\x1b[31m%s\x1b[0m', 'WsRPCServer: server --- ');

	this.sharedClient = {
		broadcast: function (method, data) {
			console.log('\x1b[31m%s\x1b[0m', 'sharedClient: broadcast --- scClient --- ', Object.keys(this.server.clients));
			this.server.broadcast(method, data);
		}.bind(this),

		sendToPeer: function (peer, procedure, data) {
			var peerSocket = this.scClient.connections[this.wsClientsConnectionsMap[peer.ip + ':' + peer.port]];
			if (!peerSocket) {
				return Q.reject();
			}
			return peerSocket.wampSend(procedure, data);
		}.bind(this)
	};
}

//ip + port -> socketId
WsRPCServer.prototype.wsClientsConnectionsMap = {};
WsRPCServer.prototype.wampClient = new WAMPClient();
WsRPCServer.prototype.scClient = scClient;

function WsRPCClient (ip, port) {

	console.log('new RPC Client created');

	if (!ip || !port) {
		throw new Error('\x1b[38m%s\x1b[0m', 'WsRPCClient needs ip and port to establish WS connection.');
	}

	var address = ip + ':' + port;

	var options = {
		hostname: ip,
		port: +port + 1000,
		protocol: 'http',
		autoReconnect: true,
		query: WsRPCClient.prototype.systemHeaders
	};

	console.log('new RPC Client created');

	this.socketReady = Q.defer();

	//return registered client if established before
	if (WsRPCServer.prototype.wsClientsConnectionsMap[address]) {
		var clientSocket = WsRPCServer.prototype.scClient.connections[WsRPCServer.prototype.wsClientsConnectionsMap[address]];
		this.socketReady.resolve();
		return clientSocket;
	} else {
		this.initializeNewConnection(options, address, this.socketReady);
	}

	// this.sendAfterSocketReady = function (procedureName) {
	// 	return function (data) {
	// 		return this.socketReady.promise.then(function (socket) {
	// 			return socket.wampSend(procedureName, data)
	// 				.catch(function (err) {
	// 					console.log('BANNING PEER AFTER WRONG RESPONSE');
	// 					throw new Error(err);
	// 				// modules.peers.ban(ip, port, 600);
	// 			});
	// 		});
	// 	}.bind(this);
	// }.bind(this);

	this.sendAfterSocketReadyCb = function (procedureName) {
		return function () {
			var cb = _.isFunction(_.last(arguments)) ? _.last(arguments) : _.noop();
			var data = !_.isFunction(arguments[0]) ? arguments[0] : {};
			console.log('\x1b[38m%s\x1b[0m', 'RPC CLIENT --- SOCKET READY - SENDING REQ: ', procedureName, data);
			this.socketReady.promise.then(function () {
				return socket.wampSend(procedureName, data)
					.then(function (res) {
						return setImmediate(cb, null, res);
					})
					.catch(function (err) {
						console.log('\x1b[38m%s\x1b[0m', 'BANNING PEER AFTER WRONG RESPONSE', procedureName);
						return setImmediate(cb, err);
					});
			}).catch(function (err) {
				console.log('\x1b[38m%s\x1b[0m', 'RPC CLIENT - Connection rejected by failed handshake', procedureName, data, err);
				this.socketReady = Q.defer();
				return setImmediate(cb, 'RPC CLIENT - Connection rejected by failed handshake procedure --- ', procedureName, err);
			}.bind(this));
		}.bind(this);
	}.bind(this);

	console.log('\x1b[31m%s\x1b[0m', 'WsRPCClient: server ---');
	this.clientStub(this.sendAfterSocketReadyCb, this);
}

WsRPCClient.prototype.initializeNewConnection = function (options, address, socketReady) {

	console.log('\x1b[31m%s\x1b[0m', 'WsRPCClient: initializeNewConnection --- with: ', options);

	var clientSocket = WsRPCServer.prototype.scClient.connect(options);

	WsRPCServer.prototype.wampClient.upgradeToWAMP(clientSocket);

	clientSocket.on('error', function (err) {
		console.log('\x1b[31m%s\x1b[0m', 'WsRPCClient: HANDSHAKE ERROR --- with: ', options.ip, options.port);
		return socketReady.reject('WsRPCClient: HANDSHAKE ERROR --- with: ', options.ip, options.port);
	});

	clientSocket.on('connect', function (data) {
		console.log('\x1b[31m%s\x1b[0m', 'WsRPCClient: HANDSHAKE SUCCEESS --- with: ', options.ip, options.port);
		WsRPCServer.prototype.wsClientsConnectionsMap[address] = clientSocket.id;
		// if (!constants.externalAddress) {
		// 	this.socket.wampSend('list', {query: {
		// 		nonce: options.query.nonce
		// 	}}).then(function (peers) {
		// 		console.log('this is me: ', peers[0]);
		// 		constants.externalAddress = peers[0].ip;
		// 		return socketReady.resolve(clientSocket);
		// 	}).catch(function (err) {
		// 		console.log('get myself error: ', err);
		// 		clientSocket.disconnect();
		// 		return socketReady.reject();
		// 	});
		// } else {
		return socketReady.resolve(clientSocket);
		// }
	});

	clientSocket.on('connecting', function () {
		console.log('CLIENT STARTED HANDSHAKE');
	});

	clientSocket.on('connectAbort', function (err, data) {
		console.log('\x1b[31m%s\x1b[0m', 'WsRPCClient: HANDSHAKE ABORT --- with: ',  options.ip, options.port, data, err);
		return socketReady.reject(err);
	});
};

WsRPCClient.prototype.clientStub = function (handler) {
	if (!WsRPCServer.prototype.server) {
		return {};
	}

	return _.reduce(Object.assign({}, WsRPCServer.prototype.server.endpoints.rpc, WsRPCServer.prototype.server.endpoints.event),
		function (availableCalls, procedureHandler, procedureName) {
			availableCalls[procedureName] = handler(procedureName);
			return availableCalls;
		}, {});
};

WsRPCClient.prototype.attachSystemConstants = function (systemHeaders) {
	WsRPCClient.prototype.systemHeaders = systemHeaders;
};

module.exports = {
	WsRPCClient: WsRPCClient,
	WsRPCServer: WsRPCServer
};