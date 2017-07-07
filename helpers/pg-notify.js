'use strict';

var Promise = require('bluebird');

module.exports.init = function (db, bus, logger, cb) {
	// Global connection for permanent event listeners
	var connection;
	// Map channels to bus.message events
	var channels = {
		round: 'finishRound'
	};

	function onNotification (data) {
		// Broadcast notify via events if channel is supported
		if (channels[data.channel]) {
			var round = parseInt(data.payload);
			logger.debug('pg-notify: Round changes:', round);
			bus.message(channels[data.channel], round);
		} else {
			logger.error('pg-notify: Invalid channel:', data.channel);
		}
	}

	function setListeners (client) {
		client.on('notification', onNotification);
		connection.none('LISTEN $1~', 'round')
			.catch(function (err) {
				logger.error(err);
			});
	}

	function removeListeners (client) {
		if (connection) {
			connection.none('UNLISTEN $1~', 'my-channel')
				.catch(function (err) {
					logger.error(err);
				});
		}
		client.removeListener('notification', onNotification);
	}

	function onConnectionLost (err, e) {
		logger.error('pg-notify: Connection lost', err);
		// Prevent use of the connection
		connection = null;
		removeListeners(e.client);
		// Try to re-establish connection 10 times, every 5 seconds
		reconnect(5000, 10)
			.then(function (obj) {
				logger.info('pg-notify: Reconnected successfully');
			})
			.catch(function () {
				// Failed after 10 attempts
				logger.error('pg-notify: Failed to reconnect - connection lost');
				process.exit();
			});
	}

	function reconnect (delay, maxAttempts) {
		delay = delay > 0 ? delay : 0;
		maxAttempts = maxAttempts > 0 ? maxAttempts : 1;
		return new Promise(function (resolve, reject) {
			setTimeout(function () {
				db.connect({direct: true, onLost: onConnectionLost})
					.then(function (obj) {
						// Global connection is now available
						connection = obj;
						setListeners(obj.client);
						resolve(obj);
					})
					.catch(function (err) {
						logger.error('pg-notify: Error connecting', err);
						if (--maxAttempts) {
							reconnect(delay, maxAttempts)
								.then(resolve)
								.catch(reject);
						} else {
							reject(err);
						}
					});
			}, delay);
		});
	}

	reconnect ()
		.then(function (obj) {
			logger.info('pg-notify: Initial connection estabilished');
			return setImmediate(cb);
		})
		.catch(function (err) {
			logger.info('pg-notify: Initial connection failed', err);
			return setImmediate(cb, err);
		});
};
