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
 */

'use strict';

const rewire = require('rewire');
const randomstring = require('randomstring');
const prefixedPeer = require('../../../../fixtures/peers').randomNormalizedPeer;
const modulesLoader = require('../../../../common/modules_loader');

describe('peers', () => {
	const NONCE = randomstring.generate(16);

	let storageMock;
	let peers;
	let PeersRewired;

	let scope;
	let channelMock;

	before(done => {
		storageMock = {
			entities: {
				Peer: {
					get: sinonSandbox.stub().resolves(),
				},
			},
		};

		channelMock = {
			invoke: sinonSandbox.stub(),
			once: sinonSandbox.stub(),
		};

		PeersRewired = rewire(
			'../../../../../../src/modules/chain/submodules/peers'
		);

		scope = _.defaultsDeep(
			{
				nonce: NONCE,
				components: { storage: storageMock },
				channel: channelMock,
				applicationState: {},
			},
			modulesLoader.scope
		);

		new PeersRewired((err, peersModule) => {
			peers = peersModule;
			done();
		}, scope);
	});

	describe('isPoorConsensus', () => {
		let isPoorConsensusResult;

		describe('when library.config.forging.force is true', () => {
			beforeEach(async () => {
				isPoorConsensusResult = await peers.isPoorConsensus();
			});

			it('should return false', async () =>
				expect(isPoorConsensusResult).to.be.false);
		});

		describe('when library.config.forging.force is false', () => {
			beforeEach(done => {
				scope.config.forging.force = false;
				new PeersRewired((err, peersModule) => {
					peers = peersModule;
					done();
				}, scope);
			});

			afterEach(done => {
				scope.config.forging.force = true;
				new PeersRewired((err, peersModule) => {
					peers = peersModule;
					done();
				}, scope);
			});

			describe('when consensus < MIN_BROADHASH_CONSENSUS', () => {
				beforeEach(async () => {
					peers.calculateConsensus = sinonSandbox.stub().returns(50);
					isPoorConsensusResult = await peers.isPoorConsensus();
				});

				it('should return true', async () =>
					expect(isPoorConsensusResult).to.be.true);
			});

			describe('when consensus >= MIN_BROADHASH_CONSENSUS', () => {
				beforeEach(async () => {
					peers.calculateConsensus = sinonSandbox.stub().returns(51);
					isPoorConsensusResult = await peers.isPoorConsensus();
				});

				it('should return false', async () =>
					expect(isPoorConsensusResult).to.be.false);
			});
		});
	});

	describe('getLastConsensus', () => {
		it('should return self.consensus value', async () =>
			expect(peers.getLastConsensus()).equal(
				PeersRewired.__get__('self.consensus')
			));
	});

	describe('calculateConsensus', () => {
		let samplePeers = [
			{
				ipAddress: '127.0.0.1',
				wsPort: 5000,
				height: 234,
				broadhash: prefixedPeer.broadhash,
			},
			{
				ipAddress: '127.0.0.2',
				wsPort: 5000,
				height: 234,
				broadhash: prefixedPeer.broadhash,
			},
		];
		let calculateConsensusResult;

		beforeEach(async () => {
			Object.assign(scope.applicationState, {
				broadhash: prefixedPeer.broadhash,
				height: prefixedPeer.height,
				httpPort: 'anHttpHeight',
				nonce: 'aNonce',
				os: 'anOs',
				version: '1.0.0',
				minVersion: '1.0.0-beta.0',
				protocolVersion: '1.0',
			});
			calculateConsensusResult = await peers.calculateConsensus();
		});

		afterEach(async () => {
			channelMock.invoke.resetHistory();
		});

		after(async () => {
			sinonSandbox.restore();
		});

		describe('when all CONNECTED peers match our broadhash', () => {
			before(async () => {
				channelMock.invoke
					.withArgs('network:getConnectedPeers')
					.returns(samplePeers);
			});

			it('should set self.consensus value', async () =>
				expect(PeersRewired.__get__('self.consensus')).to.equal(
					calculateConsensusResult
				));

			it('should call channel invoke only once', async () =>
				expect(channelMock.invoke.calledOnce).to.be.true);

			it('should call channel invoke with action network:getConnectedPeers', async () =>
				expect(
					channelMock.invoke.calledWithExactly('network:getConnectedPeers', {})
				).to.be.true);

			it('should return consensus as a number', async () =>
				expect(calculateConsensusResult).to.be.a('number'));

			it('should return consensus = 100', async () =>
				expect(calculateConsensusResult).to.equal(100));
		});

		describe('when half of connected peers match our broadhash', () => {
			before(async () => {
				samplePeers = [
					{
						ipAddress: '127.0.0.1',
						wsPort: 5000,
						height: 234,
						broadhash: prefixedPeer.broadhash,
					},
					{
						ipAddress: '127.0.0.2',
						wsPort: 5000,
						height: 234,
						broadhash:
							'198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783h',
					},
				];

				channelMock.invoke
					.withArgs('network:getConnectedPeers')
					.returns(samplePeers);
			});

			it('should return consensus = 50', async () =>
				expect(calculateConsensusResult).to.equal(50));
		});

		describe('when there are duplicate ips in connected peers list', () => {
			before(async () => {
				samplePeers = [
					{
						ipAddress: '127.0.0.1',
						wsPort: 5000,
						height: 234,
						broadhash: prefixedPeer.broadhash,
					},
					{
						ipAddress: '127.0.0.2',
						wsPort: 5000,
						height: 234,
						broadhash: prefixedPeer.broadhash,
					},
					{
						ipAddress: '127.0.0.2',
						wsPort: 5000,
						height: 233,
						broadhash:
							'198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783h',
					},
					{
						ipAddress: '127.0.0.3',
						wsPort: 5000,
						height: 234,
						broadhash: prefixedPeer.broadhash,
					},
				];

				channelMock.invoke
					.withArgs('network:getConnectedPeers')
					.returns(samplePeers);
			});

			it('should return consensus = 50 and only take one ip port with higher height', async () =>
				expect(calculateConsensusResult).to.equal(100));
		});
	});

	describe('getUniquePeersbyIp', () => {
		const samplePeers = [
			{
				ipAddress: '127.0.0.1',
				wsPort: 5000,
				height: 234,
				broadhash: prefixedPeer.broadhash,
			},
			{
				ipAddress: '127.0.0.2',
				wsPort: 5000,
				height: 234,
				broadhash: prefixedPeer.broadhash,
			},
			{
				ipAddress: '127.0.0.2',
				wsPort: 5000,
				height: 233,
				broadhash:
					'198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783h',
			},
			{
				ipAddress: '127.0.0.2',
				wsPort: 5000,
				height: 232,
				broadhash:
					'198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783i',
			},
			{
				ipAddress: '127.0.0.3',
				wsPort: 5000,
				height: 234,
				broadhash: prefixedPeer.broadhash,
			},
		];

		const getUniquePeersbyIp = rewire(
			'../../../../../../src/modules/chain/submodules/peers'
		).__get__('getUniquePeersbyIp');

		it('should return only 3 peers with no duplicates', async () => {
			const consolidatedPeers = getUniquePeersbyIp(samplePeers);
			const expectedPeers = [
				{
					ipAddress: '127.0.0.1',
					wsPort: 5000,
					height: 234,
					broadhash: prefixedPeer.broadhash,
				},
				{
					ipAddress: '127.0.0.2',
					wsPort: 5000,
					height: 234,
					broadhash: prefixedPeer.broadhash,
				},
				{
					ipAddress: '127.0.0.3',
					wsPort: 5000,
					height: 234,
					broadhash: prefixedPeer.broadhash,
				},
			];

			expect(consolidatedPeers).to.be.eql(expectedPeers);
		});

		it('should return blank array for peer list of zero length', async () => {
			const consolidatedPeers = getUniquePeersbyIp([]);
			expect(consolidatedPeers).to.be.eql([]);
		});
	});
});
