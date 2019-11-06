/*
 * Copyright © 2019 Lisk Foundation
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
import { expect } from 'chai';
import {
	validatePeerAddress,
	validatePeerInfo,
	validateRPCRequest,
	validateProtocolMessage,
} from '../../../src/utils';
import {
	ProtocolPeerInfo,
	P2PRequestPacket,
	P2PMessagePacket,
} from '../../../src/p2p_types';

describe('utils/validate', () => {
	describe('#validatePeerInfo', () => {
		describe('for valid peer response object', () => {
			const peer: ProtocolPeerInfo = {
				ip: '12.23.54.3',
				ipAddress: '12.23.54.3',
				wsPort: 5393,
				os: 'darwin',
				height: 23232,
				version: '1.1.2',
				protocolVersion: '1.1',
				httpPort: 2000,
			};

			const peerWithInvalidHeightValue: unknown = {
				ip: '12.23.54.3',
				ipAddress: '12.23.54.3',
				wsPort: 5393,
				os: '778',
				height: '2323wqdqd2',
				version: '3.4.5-alpha.9',
				protocolVersion: '1.1',
				httpPort: 2000,
			};

			it('should return P2PPeerInfo object', async () => {
				expect(validatePeerInfo(peer, 10000))
					.to.be.an('object')
					.eql({
						peerId: '12.23.54.3:5393',
						ipAddress: '12.23.54.3',
						wsPort: 5393,
						sharedState: {
							height: 23232,
							os: 'darwin',
							version: '1.1.2',
							protocolVersion: '1.1',
							httpPort: 2000,
						},
						internalState: {
							advertiseAddress: true,
						},
					});
			});

			it('should return P2PPeerInfo object with height value set to 0', async () => {
				expect(validatePeerInfo(peerWithInvalidHeightValue, 10000))
					.to.be.an('object')
					.eql({
						peerId: '12.23.54.3:5393',
						ipAddress: '12.23.54.3',
						wsPort: 5393,
						sharedState: {
							height: 0,
							os: '778',
							version: '3.4.5-alpha.9',
							protocolVersion: '1.1',
							httpPort: 2000,
						},
						internalState: {
							advertiseAddress: true,
						},
					});
			});
		});

		describe('for invalid peer response object', () => {
			it('should throw an InvalidPeer error for invalid peer', async () => {
				const peerInvalid: unknown = null;

				expect(validatePeerInfo.bind(null, peerInvalid, 10000)).to.throw(
					'Invalid peer object',
				);
			});

			it('should throw if PeerInfo is too big', async () => {
				const peer: ProtocolPeerInfo = {
					ip: '12.23.54.3',
					ipAddress: '12.23.54.3',
					wsPort: 5393,
					os: 'darwin',
					height: 23232,
					version: '1.1.2',
					protocolVersion: '1.1',
					httpPort: 2000,
				};

				expect(validatePeerInfo.bind(null, peer, 10)).to.throw(
					'PeerInfo was larger than the maximum allowed 10 bytes',
				);
			});

			it('should throw InvalidPeer error for invalid peer ip or port', async () => {
				const peerInvalid: unknown = {
					ip: '12.23.54.uhig3',
					wsPort: 53937888,
					height: '23232',
					discoveredInfo: {
						os: 'darwin',
					},
				};

				expect(validatePeerInfo.bind(null, peerInvalid, 10000)).to.throw(
					'Invalid peer ip or port',
				);
			});

			it('should throw an InvalidPeer error for invalid peer version', async () => {
				const peerInvalid: unknown = {
					ip: '12.23.54.23',
					wsPort: 5390,
					os: 'darwin',
					height: '23232',
					version: '1222.22',
					protocolVersion: '1.1',
				};

				expect(validatePeerInfo.bind(null, peerInvalid, 10000)).to.throw(
					'Invalid peer version',
				);
			});
		});
	});

	describe('#validatePeerAddress', () => {
		it('should return true for correct IPv4', async () => {
			const peer = {
				ip: '12.12.12.12',
				wsPort: 4001,
			};

			expect(validatePeerAddress(peer.ip, peer.wsPort)).to.be.true;
		});

		it('should return true for correct IPv6', async () => {
			const peer = {
				ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
				wsPort: 4001,
			};

			expect(validatePeerAddress(peer.ip, peer.wsPort)).to.be.true;
		});

		it('should return false for incorrect ip', async () => {
			const peerWithIncorrectIp = {
				ip: '12.12.hh12.12',
				wsPort: 4001,
			};

			expect(
				validatePeerAddress(peerWithIncorrectIp.ip, peerWithIncorrectIp.wsPort),
			).to.be.false;
		});

		it('should return false for incorrect port', async () => {
			const peerWithIncorrectPort = {
				ip: '12.12.12.12',
				wsPort: NaN,
			};

			expect(
				validatePeerAddress(
					peerWithIncorrectPort.ip,
					peerWithIncorrectPort.wsPort,
				),
			).to.be.false;
		});
	});

	describe('#validateRPCRequest', () => {
		const validRPCRequest: unknown = {
			data: {},
			procedure: 'list',
			type: '',
		};
		let validatedRPCRequest: P2PRequestPacket;

		beforeEach(async () => {
			validatedRPCRequest = validateRPCRequest(validRPCRequest);
		});

		it('should throw an error for an invalid procedure value', async () => {
			expect(validateRPCRequest.bind(validateRPCRequest, undefined)).to.throw(
				'Invalid request',
			);
		});

		it('should throw an error for an invalid procedure value', async () => {
			const inValidRequest: unknown = {
				data: {},
				procedure: {},
			};

			expect(
				validateRPCRequest.bind(validateRPCRequest, inValidRequest),
			).to.throw('Request procedure name is not a string');
		});

		it('should pass and return an object', async () => {
			expect(validatedRPCRequest).to.be.an('object');
		});

		it('should return a valid rpc request', async () => {
			expect(validatedRPCRequest)
				.to.be.an('object')
				.has.property('data')
				.to.be.an('object');
			expect(validatedRPCRequest)
				.to.be.an('object')
				.has.property('procedure').to.be.string;

			expect(validatedRPCRequest)
				.to.be.an('object')
				.has.property('type').to.be.string;
		});
	});

	describe('#validateProtocolMessage', () => {
		const validProtocolMessage: unknown = {
			data: {},
			event: 'newPeer',
		};
		let returnedValidatedMessage: P2PMessagePacket;

		beforeEach(async () => {
			returnedValidatedMessage = validateProtocolMessage(validProtocolMessage);
		});

		it('should throw an error for an invalid event value type', async () => {
			expect(
				validateProtocolMessage.bind(validateProtocolMessage, undefined),
			).to.throw('Invalid message');
		});

		it('should throw an error for an invalid event value type', async () => {
			const inValidMessage: unknown = {
				data: {},
				event: 6788,
			};
			expect(
				validateProtocolMessage.bind(validateProtocolMessage, inValidMessage),
			).to.throw('Protocol message is not a string');
		});

		it('should return an object', async () => {
			expect(returnedValidatedMessage).to.be.an('object');
		});

		it('should return a valid protocol message object', async () => {
			expect(returnedValidatedMessage)
				.to.be.an('object')
				.has.property('data');

			expect(returnedValidatedMessage)
				.to.be.an('object')
				.has.property('data').to.be.string;
		});
	});
});
