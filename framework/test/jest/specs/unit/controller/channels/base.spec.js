const BaseChannel = require('../../../../../../src/controller/channels/base');
const Action = require('../../../../../../src/controller/action');
const Event = require('../../../../../../src/controller/event');

jest.mock('../../../../../../src/controller/action');
jest.mock('../../../../../../src/controller/event');

// Arrange
const params = {
	alias: 'alias',
	events: ['event1', 'event2'],
	actions: {
		action1: jest.fn(),
		action2: jest.fn(),
		action3: jest.fn(),
	},
	options: {},
};

describe('Base Channel', () => {
	let baseChannel = null;

	beforeEach(() => {
		// Act
		baseChannel = new BaseChannel(
			params.alias,
			params.events,
			params.actions,
			params.options
		);
	});

	describe('#constructor', () => {
		it('should create the instance with given arguments.', () => {
			// Assert
			expect(baseChannel.moduleAlias).toBe(params.alias);
			expect(baseChannel.options).toBe(params.options);

			params.events.forEach(event => {
				expect(Event).toHaveBeenCalledWith(`${params.alias}:${event}`);
			});

			Object.keys(params.actions).forEach(action => {
				expect(Action).toHaveBeenCalledWith(`${params.alias}:${action}`);
			});
		});
	});

	describe('getters', () => {
		it('base.actionList should contain list of Action Objects', () => {
			// Assert
			expect(baseChannel.actionsList).toHaveLength(3);
			baseChannel.actionsList.forEach(action => {
				expect(action).toBeInstanceOf(Action);
			});
		});

		it('base.eventsList should contain list of Event Objects', () => {
			// Arrange & Act
			baseChannel = new BaseChannel(
				params.alias,
				params.events,
				params.actions,
				{
					skipInternalEvents: true,
				}
			);

			// Assert
			expect(baseChannel.eventsList).toHaveLength(2);
			baseChannel.eventsList.forEach(event => {
				expect(event).toBeInstanceOf(Event);
			});
		});

		it.todo(
			'base.eventsList should contain internal events when skipInternalEvents option was set true'
		);
	});

	describe('#registerToBus', () => {
		it('should throw TypeError', () => {
			// Assert
			expect(baseChannel.registerToBus()).rejects.toBeInstanceOf(TypeError);
		});
	});

	describe('#subscribe', () => {
		it('should throw TypeError', () => {
			// Assert
			expect(baseChannel.subscribe).toThrow(TypeError);
		});
	});

	describe('#publish', () => {
		it('should throw TypeError', () => {
			// Assert
			expect(baseChannel.publish).toThrow(TypeError);
		});
	});

	describe('#invoke', () => {
		it('should throw TypeError', () => {
			// Assert
			expect(baseChannel.invoke()).rejects.toBeInstanceOf(TypeError);
		});
	});

	describe('#isValidEventName', () => {
		// Arrange
		const eventName = params.events[0];

		it('should return false when invalid event name was provided', () => {
			//  Act & Assert
			expect(baseChannel.isValidEventName(eventName, false)).toBe(false);
		});

		it('should throw error when throwError was set to `true`.', () => {
			// Act & Assert
			expect(() => baseChannel.isValidEventName(eventName)).toThrow();
		});

		it('should return true when valid event name was provided.', () => {
			// Act & Assert
			expect(baseChannel.isValidEventName(`${params.alias}:${eventName}`)).toBe(
				true
			);
		});
	});

	describe('#isValidActionName', () => {
		// Arrange
		const actionName = 'actionName';

		it('should return false when invalid action name was provided', () => {
			//  Act & Assert
			expect(baseChannel.isValidActionName(actionName, false)).toBe(false);
		});

		it('should throw error when throwError was set to `true`.', () => {
			// Act & Assert
			expect(() => baseChannel.isValidActionName(actionName)).toThrow();
		});

		it('should return true when valid event name was provided.', () => {
			// Act & Assert
			expect(
				baseChannel.isValidActionName(`${params.alias}:${actionName}`)
			).toBe(true);
		});
	});
});
