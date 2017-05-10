'use strict';

var redis = require('redis');

module.exports.connect = function (config, logger, cb) {
	var client = redis.createClient(config);

	client.on('connect', function () {
		logger.info('App connected with redis server');
		cb(null, client);
	});

	client.on('error', function (err) {
		logger.error('Redis:', err);
	});
	
	client.monitor(function () {
		logger.info('Entering monitoring mode');
	});

	client.on('monitor', function (time, args, raw_reply) {
		logger.info('Redis:', time, args, raw_reply);
	});
};
