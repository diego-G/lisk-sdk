'use strict';


/**
 * Binds api with modules and creates common url.
 * - End point: `/api/blocks`
 * - Public API:
 * 	- get	/
 * @memberof module:blocks
 * @requires helpers/Router
 * @requires helpers/httpApi
 * @constructor
 * @param {Object} blocksModule - Module blocks instance.
 * @param {scope} app - Network app.
 */
var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');
// Constructor
function BlocksHttpApi (blocksModule, app, logger, cache) {

	var router = new Router();

	// attach a middlware to endpoints
	router.attachMiddlwareForUrls(httpApi.middleware.useCache.bind(null, logger, cache), [
		'get /'
	]);

	router.map(blocksModule.shared, {
		'get /': 'getBlocks'
	}, {responseWithCode: true});

	httpApi.registerEndpoint('/api/blocks', app, router, blocksModule.isLoaded);
}

module.exports = BlocksHttpApi;
