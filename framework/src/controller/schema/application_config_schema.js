module.exports = {
	id: '#/app/config',
	type: 'object',
	required: ['app', 'components', 'modules'],
	properties: {
		app: {
			type: 'object',
			required: [
				'version',
				'minVersion',
				'protocolVersion',
				'ipc',
				'genesisConfig',
			],
			properties: {
				label: { type: 'string', pattern: '^[a-zA-Z][0-9a-zA-Z\\_\\-]*$' },
				version: {
					type: 'string',
					format: 'version',
				},
				minVersion: {
					type: 'string',
					format: 'version',
				},
				protocolVersion: {
					type: 'string',
					format: 'protocolVersion',
				},
				ipc: {
					type: 'object',
					properties: {
						enabled: {
							type: 'boolean',
						},
					},
				},
				initialState: {
					id: '#/app/initialState',
					type: 'object',
					properties: {
						nethash: {
							type: 'string',
						},
						version: {
							type: 'string',
						},
						wsPort: {
							type: 'integer',
						},
						httpPort: {
							type: 'integer',
						},
						minVersion: {
							type: 'string',
						},
						protocolVersion: {
							type: 'string',
						},
						nonce: {
							type: 'string',
						},
					},
				},
				genesisConfig: {
					id: '#/app/genesisConfig',
					type: 'object',
					required: [
						'EPOCH_TIME',
						'BLOCK_TIME',
						'MAX_TRANSACTIONS_PER_BLOCK',
						'REWARDS',
					],
					properties: {
						EPOCH_TIME: {
							type: 'string',
							format: 'date-time',
							description:
								'Timestamp indicating the start of Lisk Core (`Date.toISOString()`)',
						},
						BLOCK_TIME: {
							type: 'number',
							min: 1,
							description: 'Slot time interval in seconds',
						},
						MAX_TRANSACTIONS_PER_BLOCK: {
							type: 'integer',
							min: 1,
							description: 'Maximum number of transactions allowed per block',
						},
						REWARDS: {
							id: 'rewards',
							type: 'object',
							required: ['MILESTONES', 'OFFSET', 'DISTANCE'],
							description: 'Object representing LSK rewards milestone',
							properties: {
								MILESTONES: {
									type: 'array',
									items: {
										type: 'string',
										format: 'amount',
									},
									description: 'Initial 5, and decreasing until 1',
								},
								OFFSET: {
									type: 'integer',
									min: 1,
									description: 'Start rewards at block (n)',
								},
								DISTANCE: {
									type: 'integer',
									min: 1,
									description: 'Distance between each milestone',
								},
							},
							additionalProperties: false,
						},
					},
					additionalProperties: false,
				},
			},
		},
		components: {
			type: 'object',
			required: ['logger', 'cache', 'storage'],
			properties: {
				logger: {
					type: 'object',
				},
				cache: {
					type: 'object',
				},
				storage: {
					type: 'object',
				},
			},
		},
		modules: {
			type: 'object',
			required: ['chain', 'http_api'],
			properties: {
				chain: {
					type: 'object',
				},
				http_api: {
					type: 'object',
				},
			},
		},
	},
	additionalProperties: false,
	default: {
		app: {
			ipc: {
				enabled: false,
			},
			genesisConfig: {
				EPOCH_TIME: new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)).toISOString(),
				BLOCK_TIME: 10,
				MAX_TRANSACTIONS_PER_BLOCK: 25,
				REWARDS: {
					MILESTONES: [
						'500000000', // Initial Reward
						'400000000', // Milestone 1
						'300000000', // Milestone 2
						'200000000', // Milestone 3
						'100000000', // Milestone 4
					],
					OFFSET: 2160, // Start rewards at first block of the second round
					DISTANCE: 3000000, // Distance between each milestone
				},
			},
		},
		components: {
			system: {},
			logger: {},
			cache: {},
			storage: {},
		},
		modules: {
			chain: {},
			http_api: {},
		},
	},
};
