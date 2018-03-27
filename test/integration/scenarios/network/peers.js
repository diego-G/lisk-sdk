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
 */

'use strict';

var Promise = require('bluebird');
var utils = require('../../utils');

module.exports = function(params) {
	describe('Peers', () => {
		describe('mutual connections', () => {
			it('should return a list of peers mutually interconnected', () => {
				return Promise.all(
					params.sockets.map(socket => {
						return socket.call('list', {});
					})
				).then(results => {
					results.forEach(result => {
						expect(result).to.have.property('success').to.be.true;
						expect(result)
							.to.have.property('peers')
							.to.be.a('array');
						var peerPorts = result.peers.map(peer => {
							return peer.wsPort;
						});
						var allPorts = params.configurations.map(configuration => {
							return configuration.wsPort;
						});
						expect(_.intersection(allPorts, peerPorts)).to.be.an('array').and
							.not.to.be.empty;
					});
				});
			});
		});

		describe('forging', () => {
			function getNetworkStatus(cb) {
				Promise.all(
					params.sockets.map(socket => {
						return socket.call('status');
					})
				)
					.then(results => {
						var maxHeight = 1;
						var heightSum = 0;
						results.forEach(result => {
							expect(result).to.have.property('success').to.be.true;
							expect(result)
								.to.have.property('height')
								.to.be.a('number');
							if (result.height > maxHeight) {
								maxHeight = result.height;
							}
							heightSum += result.height;
						});
						return cb(null, {
							height: maxHeight,
							averageHeight: heightSum / results.length,
						});
					})
					.catch(err => {
						cb(err);
					});
			}

			before(done => {
				// Expect some blocks to forge after 30 seconds
				var timesToCheckNetworkStatus = 30;
				var timesNetworkStatusChecked = 0;
				var checkNetworkStatusInterval = 1000;

				var checkingInterval = setInterval(() => {
					getNetworkStatus((err, res) => {
						timesNetworkStatusChecked += 1;
						if (err) {
							clearInterval(checkingInterval);
							return done(err);
						}
						utils.logger.log(
							`network status: height - ${res.height}, average height - ${
								res.averageHeight
							}`
						);
						if (timesNetworkStatusChecked === timesToCheckNetworkStatus) {
							clearInterval(checkingInterval);
							return done(null, res);
						}
					});
				}, checkNetworkStatusInterval);
			});

			describe('network status after 30 seconds', () => {
				var getNetworkStatusError;
				var networkHeight;
				var networkAverageHeight;

				before(done => {
					getNetworkStatus((err, res) => {
						getNetworkStatusError = err;
						networkHeight = res.height;
						networkAverageHeight = res.averageHeight;
						done();
					});
				});

				it('should have no error', () => {
					return expect(getNetworkStatusError).not.to.exist;
				});

				it('should have height > 1', () => {
					return expect(networkHeight).to.be.above(1);
				});

				it('should have average height above 1', () => {
					return expect(networkAverageHeight).to.be.above(1);
				});

				it('should have different peers heights propagated correctly on peers lists', () => {
					return Promise.all(
						params.sockets.map(socket => {
							return socket.call('list', {});
						})
					).then(results => {
						expect(
							results.some(peersList => {
								return peersList.peers.some(peer => {
									return peer.height > 1;
								});
							})
						);
					});
				});
			});

			describe('network height after 30 seconds', () => {
				let nodeList = [];
				let peersCount;
				let networkHeight;
				before(done => {
					Promise.all(
						params.sockets.map(socket => {
							return socket.call('list', {});
						})
					).then(peers => {
						peersCount = peers.length;
						const fn = function getNodeStatus(peer) {
							return utils.http.getNodeStatus(peer.httpPort, peer.ip);
						};
						const actions = peers.map(fn);
						const status = Promise.all(actions);
						status
							.then(data => {
								networkHeight = _.countBy(data, 'networkHeight');
								nodeList = data;
								done();
							})
							.catch(err => {
								done(err);
							});
					});
				});

				it('should have a networkHeight which is greater than 0 for all the peers', () => {
					expect(nodeList)
						.to.be.a('Array')
						.to.have.lengthOf(peersCount);
					return expect(networkHeight['0']).to.be.undefined;
				});

				it('should have same networkHeight for all the peers', () => {
					return expect(Object.keys(networkHeight)).to.have.lengthOf(1);
				});
			});
		});
	});
};
