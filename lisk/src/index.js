const fs = require('fs');
const path = require('path');

const {
	Application,
	helpers: { configurator },
	/* eslint-disable import/no-unresolved */
} = require('lisk-framework');

const packageJSON = require('../package');

const appConfig = {
	app: {
		version: packageJSON.version,
		minVersion: packageJSON.lisk.minVersion,
		protocolVersion: packageJSON.lisk.protocolVersion,
	},
};

// Support for PROTOCOL_VERSION only for tests
if (process.env.NODE_ENV === 'test' && process.env.PROTOCOL_VERSION) {
	appConfig.app.protocolVersion = process.env.PROTOCOL_VERSION;
}

const appSchema = {
	type: 'object',
	properties: {
		NETWORK: {
			type: 'string',
			description:
				'lisk network [devnet|betanet|mainnet|testnet]. Defaults to "devnet"',
			enum: ['devnet', 'alphanet', 'betanet', 'testnet', 'mainnet'],
			env: 'LISK_NETWORK',
			arg: '--network,-n',
		},
		CUSTOM_CONFIG_FILE: {
			type: ['string', 'null'],
			description: 'Custom configuration file path',
			default: null,
			env: 'LISK_CONFIG_FILE',
			arg: '--config,-c',
		},
	},
	default: {
		NETWORK: 'devnet',
		CUSTOM_CONFIG_FILE: null,
	},
};

configurator.registerSchema(appSchema);

try {
	const { NETWORK, CUSTOM_CONFIG_FILE } = configurator.getConfig();

	configurator.loadConfigFile(path.resolve(__dirname, `../config/${NETWORK}/config`));
	configurator.loadConfigFile(path.resolve(__dirname, `../config/${NETWORK}/exceptions`), 'modules.chain.exceptions');

	/* eslint-disable import/no-dynamic-require */
	const genesisBlock = require(`../config/${NETWORK}/genesis_block`);

	if (CUSTOM_CONFIG_FILE) {
		configurator.loadConfigFile(path.resolve(CUSTOM_CONFIG_FILE));
	}

	// To run multiple applications for same network for integration tests
	const appName = config =>
		`lisk-${NETWORK}-${config.modules.http_api.httpPort}`;

	/*
	TODO: Merge 3rd and 4th argument into one single object that would come from config/NETWORK/config.json
	Exceptions and constants.js will be removed.
	 */
	const app = new Application(appName, genesisBlock, configurator);

	app
		.run()
		.then(() => app.logger.log('App started...'))
		.catch(error => {
			if (error instanceof Error) {
				app.logger.error('App stopped with error', error.message);
				app.logger.debug(error.stack);
			} else {
				app.logger.error('App stopped with error', error);
			}
			process.exit();
		});
} catch (e) {
	console.error('Application start error.', e);
	process.exit();
}
