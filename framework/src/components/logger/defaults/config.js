const defaultConfig = {
	type: 'object',
	properties: {
		fileLogLevel: {
			type: 'string',
			enum: ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'none'],
			env: 'LISK_FILE_LOG_LEVEL',
			arg: '--log,-l',
		},
		logFileName: {
			type: 'string',
			env: 'LISK_REDIS_HOST',
		},
		consoleLogLevel: {
			type: 'string',
			enum: ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'none'],
			env: 'LISK_CONSOLE_LOG_LEVEL',
		},
	},
	required: ['fileLogLevel', 'logFileName', 'consoleLogLevel'],
	default: {
		fileLogLevel: 'info',
		consoleLogLevel: 'none',
		logFileName: 'logs/lisk.log',
	},
};

module.exports = defaultConfig;
