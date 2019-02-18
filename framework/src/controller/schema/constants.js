module.exports = {
	constants: {
		$id: '#constants',
		type: 'object',
		required: [
			'ACTIVE_DELEGATES',
			'BLOCK_SLOT_WINDOW',
			'ADDITIONAL_DATA',
			'BLOCK_RECEIPT_TIMEOUT',
			'EPOCH_TIME',
			'FEES',
			'MAX_PAYLOAD_LENGTH',
			'MAX_PEERS',
			'MAX_SHARED_TRANSACTIONS',
			'MAX_TRANSACTIONS_PER_BLOCK',
			'MAX_VOTES_PER_TRANSACTION',
			'MAX_VOTES_PER_ACCOUNT',
			'MIN_BROADHASH_CONSENSUS',
			'MULTISIG_CONSTRAINTS',
			'NETHASHES',
			'NORMALIZER',
			'REWARDS',
			'TOTAL_AMOUNT',
			'UNCONFIRMED_TRANSACTION_TIMEOUT',
			'EXPIRY_INTERVAL',
		],
		properties: {
			ACTIVE_DELEGATES: {
				type: 'integer',
				min: 51,
			},
			BLOCK_SLOT_WINDOW: {
				type: 'integer',
				min: 5,
			},
			ADDITIONAL_DATA: {
				type: 'object',
				required: ['MIN_LENGTH', 'MAX_LENGTH'],
				properties: {
					MIN_LENGTH: {
						type: 'integer',
						min: 1,
					},
					MAX_LENGTH: {
						type: 'integer',
					},
				},
			},
			BLOCK_RECEIPT_TIMEOUT: {
				type: 'integer',
			},
			EPOCH_TIME: {
				type: 'string',
				format: 'date-time',
			},
			FEES: {
				type: 'object',
				schema: {
					$ref: '#fees',
				},
			},
			MAX_PAYLOAD_LENGTH: {
				type: 'integer',
				min: 1, // @todo Calculate this property later on.
			},
			MAX_PEERS: {
				type: 'integer',
			},
			MAX_SHARED_TRANSACTIONS: {
				type: 'integer',
			},
			MAX_TRANSACTIONS_PER_BLOCK: {
				type: 'integer',
				min: 1,
			},
			MAX_VOTES_PER_TRANSACTION: {
				type: 'integer',
				min: 1,
			},
			MAX_VOTES_PER_ACCOUNT: {
				type: 'integer',
			},
			MIN_BROADHASH_CONSENSUS: {
				type: 'integer',
			},
			MULTISIG_CONSTRAINTS: {
				type: 'object',
				schema: {
					$ref: '#multisig',
				},
			},
			NETHASHES: {
				type: 'array',
				items: {
					type: 'string',
					pattern: '^[a-f0-9]{64}$',
				},
			},
			NORMALIZER: {
				type: 'string',
				pattern: '^[1-9][0-9]*$',
			},
			REWARDS: {
				type: 'object',
				schema: {
					$ref: '#rewards',
				},
			},
			TOTAL_AMOUNT: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
			UNCONFIRMED_TRANSACTION_TIMEOUT: {
				type: 'integer',
				min: 1,
			},
			EXPIRY_INTERVAL: {
				type: 'integer',
				min: 1,
			},
		},
	},

	fees: {
		$id: '#fees',
		type: 'object',
		required: [
			'SEND',
			'VOTE',
			'SECOND_SIGNATURE',
			'DELEGATE',
			'MULTISIGNATURE',
			'DAPP_REGISTRATION',
			'DAPP_WITHDRAWAL',
			'DAPP_DEPOSIT',
		],
		properties: {
			SEND: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
			VOTE: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
			SECOND_SIGNATURE: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
			DELEGATE: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
			MULTISIGNATURE: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
			DAPP_REGISTRATION: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
			DAPP_WITHDRAWAL: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
			DAPP_DEPOSIT: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
		},
	},

	multisig: {
		$id: '#multisig',
		type: 'object',
		required: ['MIN', 'LIFETIME', 'KEYSGROUP'],
		properties: {
			MIN: {
				type: 'object',
				schema: {
					$ref: '#minConstraints',
				},
			},
			LIFETIME: {
				type: 'object',
				schema: {
					$ref: '#lifetimeConstraints',
				},
			},
			KEYSGROUP: {
				type: 'object',
				schema: {
					$ref: '#keysgroupConstraints',
				},
			},
		},
	},

	minConstraints: {
		$id: '#minConstraints',
		type: 'object',
		required: ['MINIMUM', 'MAXIMUM'],
		properties: {
			MINIMUM: {
				type: 'integer',
				min: 1,
				// Max value is lower than or equal to MULTISIG_CONSTRAINTS.KEYSGROUP.MAX_ITEMS
				// Problem: Cannot reference value outside of this object
				// e.g. max: `{ $data: '1/path-to-MAX_ITEMS'}`
			},
			MAXIMUM: {
				type: 'integer',
			},
		},
	},

	lifetimeConstraints: {
		$id: '#lifetimeConstraints',
		type: 'object',
		required: ['MINIMUM', 'MAXIMUM'],
		properties: {
			MINIMUM: {
				type: 'integer',
			},
			MAXIMUM: {
				type: 'integer',
			},
		},
	},

	keysgroupConstraints: {
		$id: '#keysgroupConstraints',
		type: 'object',
		required: ['MIN_ITEMS', 'MAX_ITEMS'],
		properties: {
			MIN_ITEMS: {
				type: 'integer',
			},
			MAX_ITEMS: {
				type: 'integer',
			},
		},
	},

	rewards: {
		$id: '#rewards',
		type: 'object',
		required: ['MILESTONES', 'OFFSET', 'DISTANCE'],
		properties: {
			MILESTONES: {
				type: 'array',
				items: {
					type: 'string',
					pattern: '^[0-9]+$',
				},
			},
			OFFSET: {
				type: 'integer',
			},
			DISTANCE: {
				type: 'integer',
			},
		},
	},
};
