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

const ApplicationState = require('../../../../../src/controller/application_state');

jest.mock('os', () => ({
	platform: jest.fn(() => 'platform'),
	release: jest.fn(() => 'release'),
}));

describe('Application State', () => {
	let applicationState = null;
	const initialState = {
		version: '1.0.0-beta.3',
		wsPort: '3001',
		httpPort: '3000',
		minVersion: '1.0.0-beta.0',
		protocolVersion: '1.0',
		nethash: 'test broadhash',
		nonce: 'test nonce',
	};
	const mockedState = {
		os: 'platformrelease',
		version: '1.0.0-beta.3',
		wsPort: '3001',
		httpPort: '3000',
		minVersion: '1.0.0-beta.0',
		protocolVersion: '1.0',
		nethash: 'test broadhash',
		broadhash: 'test broadhash',
		height: 1,
		nonce: 'test nonce',
	};
	const logger = {
		debug: jest.fn(),
		error: jest.fn(),
	};

	const channel = {
		publish: jest.fn(),
	};

	beforeEach(() => {
		// Act
		applicationState = new ApplicationState({
			initialState,
			logger,
		});
	});

	describe('#constructor', () => {
		it('should initiate the application state', () => {
			// Assert
			expect(applicationState.logger).toBe(logger);
			expect(applicationState.stateChannel).toBe(undefined);
		});
	});

	describe('#get state', () => {
		it('should get the state', () => {
			// Arrange
			const spy = jest.spyOn(applicationState, 'state', 'get');

			// Act
			const state = applicationState.state;

			// Assert
			expect(spy).toHaveBeenCalled();
			expect(state).toEqual(mockedState);

			// Clean
			spy.mockRestore();
		});
	});

	describe('#set channel', () => {
		it('should set the channel', () => {
			// Arrange
			const spy = jest.spyOn(applicationState, 'channel', 'set');

			// Act
			applicationState.channel = channel;

			// Assert
			expect(spy).toHaveBeenCalled();
			expect(applicationState.stateChannel).toBe(channel);

			// Clean
			spy.mockRestore();
		});
	});

	describe('#update', () => {
		it('should return error if there is a problem in the channel', async () => {
			// Arrange
			const newState = {
				broadhash: 'xxx',
				height: '10',
			};
			const errorMessage = 'Publish failure';
			applicationState.channel = {
				publish: jest
					.fn()
					.mockImplementationOnce(() =>
						Promise.reject(new Error(errorMessage))
					),
			};
			try {
				// Act
				await applicationState.update(newState);
			} catch (error) {
				// Assert
				expect(error).toBeInstanceOf(Error);
				expect(error.message).toBe(errorMessage);
			}
		});

		describe('when correct parameters are passed', () => {
			let newState;
			let result;
			let spies;
			let updatedState;

			beforeEach(async () => {
				// Arrange
				newState = {
					broadhash: 'newBroadhash',
					height: '10',
				};
				applicationState.channel = channel;
				spies = {
					get: jest.spyOn(applicationState, 'state', 'get'),
				};

				// Act
				result = await applicationState.update(newState);
				updatedState = applicationState.state;
			});

			afterEach(async () => {
				// Clean
				spies.get.mockRestore();
			});

			it('should call get four times', async () => {
				// Assert
				expect(spies.get).toHaveBeenCalledTimes(4);
			});

			it('should update broadhash', async () => {
				// Assert
				expect(applicationState.state.broadhash).toBe(newState.broadhash);
				expect(updatedState.broadhash).toBe(newState.broadhash);
			});

			it('should update height', async () => {
				// Assert
				expect(applicationState.state.height).toBe(newState.height);
				expect(updatedState.height).toBe(newState.height);
			});

			it('should print notification update in logs', async () => {
				// Assert
				expect(logger.debug).toHaveBeenCalled();
				expect(logger.debug).toHaveBeenLastCalledWith(
					'Application state',
					updatedState
				);
			});

			it('should publish notification update on the channel', async () => {
				// Assert
				expect(channel.publish).toHaveBeenCalled();
				expect(channel.publish).toHaveBeenLastCalledWith(
					'lisk:state:updated',
					updatedState
				);
			});

			it('should return true', async () => {
				// Assert
				expect(result).toBe(true);
			});
		});
	});
});
