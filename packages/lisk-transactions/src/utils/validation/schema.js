/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */

export const baseTransaction = {
	$id: 'lisk/base-transaction',
	type: 'object',
	required: [
		'id',
		'type',
		'amount',
		'fee',
		'senderPublicKey',
		'recipientId',
		'timestamp',
		'asset',
		'signature',
	],
	properties: {
		id: {
			type: 'string',
			format: 'number',
			minLength: 1,
			maxLength: 20,
		},
		amount: {
			type: 'string',
			format: 'number',
		},
		fee: {
			type: 'string',
			format: 'number',
		},
		type: {
			type: 'integer',
			minimum: 0,
			maximum: 7,
		},
		timestamp: {
			type: 'integer',
		},
		senderId: {
			type: 'string',
			format: 'address',
		},
		senderPublicKey: {
			type: 'string',
			format: 'publicKey',
		},
		senderSecondPublicKey: {
			type: 'string',
			format: 'publicKey',
		},
		recipientId: {
			type: 'string',
		},
		recipientPublicKey: {
			type: ['string', 'null'],
			format: 'publicKey',
		},
		signature: {
			type: 'string',
			format: 'signature',
		},
		signSignature: {
			type: 'string',
			format: 'signature',
		},
		signatures: {
			type: 'array',
			uniqueItems: true,
			items: {
				type: 'string',
				format: 'signature',
			},
		},
		asset: {
			type: 'object',
		},
	},
};

export const transferTransaction = {
	$merge: {
		source: { $ref: 'lisk/base-transaction' },
		with: {
			properties: {
				amount: {
					type: 'string',
					format: 'number',
					minLength: 1,
				},
				recipientId: {
					format: 'address',
				},
				asset: {
					type: 'object',
					properties: {
						data: {
							type: 'string',
							maxLength: 32,
						},
					},
				},
			},
		},
	},
};

export const signatureTransaction = {
	$merge: {
		source: { $ref: 'lisk/base-transaction' },
		with: {
			properties: {
				asset: {
					type: 'object',
					required: ['signature'],
					properties: {
						signature: {
							type: 'object',
							required: ['publicKey'],
							properties: {
								publicKey: {
									type: 'string',
									format: 'publicKey',
								},
							},
						},
					},
				},
			},
		},
	},
};

export const delegateTransaction = {
	$merge: {
		source: { $ref: 'lisk/base-transaction' },
		with: {
			properties: {
				asset: {
					type: 'object',
					required: ['delegate'],
					properties: {
						delegate: {
							type: 'object',
							required: ['username'],
							properties: {
								username: {
									type: 'string',
									maxLength: 10,
								},
							},
						},
					},
				},
			},
		},
	},
};

export const voteTransaction = {
	$merge: {
		source: { $ref: 'lisk/base-transaction' },
		with: {
			properties: {
				asset: {
					type: 'object',
					required: ['votes'],
					properties: {
						votes: {
							type: 'array',
							uniqueItems: true,
							minItems: 1,
							maxItems: 33,
							items: {
								type: 'string',
								format: 'actionPublicKey',
							},
						},
					},
				},
			},
		},
	},
};

export const multiTransaction = {
	$merge: {
		source: { $ref: 'lisk/base-transaction' },
		with: {
			properties: {
				asset: {
					type: 'object',
					required: ['multisignature'],
					properties: {
						multisignature: {
							type: 'object',
							required: ['min', 'lifetime', 'keysgroup'],
							properties: {
								min: {
									type: 'integer',
									minimum: 1,
									maximum: 16,
								},
								lifetime: {
									type: 'integer',
									minimum: 1,
									maximum: 24,
								},
								keysgroup: {
									type: 'array',
									uniqueItems: true,
									minItems: 2,
									maxItems: 16,
									items: {
										type: 'string',
										format: 'actionPublicKey',
									},
								},
							},
						},
					},
				},
			},
		},
	},
};

export const dappTransaction = {
	$merge: {
		source: { $ref: 'lisk/base-transaction' },
		with: {
			properties: {
				asset: {
					type: 'object',
					required: ['dapp'],
					properties: {
						dapp: {
							type: 'object',
							required: ['name', 'type', 'category', 'link'],
							properties: {
								icon: {
									type: 'string',
								},
								category: {
									type: 'integer',
								},
								type: {
									type: 'integer',
								},
								link: {
									type: 'string',
								},
								tags: {
									type: 'string',
								},
								description: {
									type: 'string',
								},
								name: {
									type: 'string',
								},
							},
						},
					},
				},
			},
		},
	},
};
