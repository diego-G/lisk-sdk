'use strict';

var _ = require('lodash');

// Private Fields
var modules;

/**
 * Initializes with scope content and private variables:
 * - modules
 * @class
 * @classdesc Main System methods.
 * @param {scope} scope - App instance.
 */
// Constructor
function Controller (scope) {
	modules = scope.modules; 
}

function getPeers (req, res) {

	var filters = {
		ip: req.swagger.params.ip.value,
		port: req.swagger.params.wsPort.value,
		httpPort: req.swagger.params.httpPort.value,
		state: req.swagger.params.state.value,
		os: req.swagger.params.os.value,
		version: req.swagger.params.version.value,
		broadhash: req.swagger.params.broadhash.value,
		height: req.swagger.params.height.value,
		limit: req.swagger.params.limit.value,
		offset: req.swagger.params.offset.value,
		orderBy: req.swagger.params.sort.value
	};

	// Remove filters with null values
	filters = _.pickBy(filters, _.identity);

	modules.peers.shared.getPeersSwagger(filters, function (err, data) {
		res.send(data);
	});
};

module.exports = {
	getPeers: getPeers,
	bind: Controller
};