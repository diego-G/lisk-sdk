const Application = require('./controller/application');
const constants = require('./controller/defaults/constants');
const version = require('./version');

/**
 * @namespace framework
 * @type {{constants, Application: (module.Application|*), version: string}}
 */
module.exports = {
	Application,
	constants,
	version,
};
