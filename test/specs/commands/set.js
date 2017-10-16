/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
import fs from 'fs';
import os from 'os';
import set from '../../../src/commands/set';
import env from '../../../src/utils/env';
import {
	readJsonSync,
	writeJsonSync,
} from '../../../src/utils/fs';
import liskInstance from '../../../src/utils/liskInstance';
import tablify from '../../../src/utils/tablify';
import {
	getCommands,
	getRequiredArgs,
	setUpVorpalWithCommand,
} from './utils';

const configFilePath = `${os.homedir()}/.lisky/config.json`;
const writeConfig = config => writeJsonSync(configFilePath, config);

const initialConfig = readJsonSync(configFilePath);

const defaultConfig = {
	name: 'lisky',
	json: false,
	liskJS: {
		testnet: false,
	},
};

describe('lisky set command palette', () => {
	let vorpal;
	let capturedOutput = [];

	beforeEach(() => {
		writeConfig(defaultConfig);
		vorpal = setUpVorpalWithCommand(set, capturedOutput);
	});

	afterEach(() => {
		vorpal.ui.removeAllListeners();
		capturedOutput = [];
	});

	after(() => {
		writeConfig(initialConfig);
	});

	describe('setup', () => {
		const commandName = 'set';

		it('should be available', () => {
			const setCommands = getCommands(vorpal, commandName);
			(setCommands).should.have.length(1);
		});

		it('should have 2 required inputs', () => {
			const requiredArgs = getRequiredArgs(vorpal, commandName);
			(requiredArgs).should.have.length(2);
		});
	});

	describe('problems', () => {
		it('should handle unknown config variables', () => {
			const invalidVariableCommand = 'set xxx true';
			return vorpal.exec(invalidVariableCommand, () => {
				(capturedOutput[0]).should.be.equal('Unsupported variable name.');
			});
		});

		describe('without write file permissions', () => {
			const command = 'set json true';

			beforeEach(() => {
				sandbox.stub(fs, 'writeFileSync').throws('EACCES: permission denied, open \'~/.lisky/config.json\'');
			});

			it('should show a warning if the config file is not writable', () => {
				return vorpal.exec(command)
					.then(() => {
						(capturedOutput[0]).should.be.equal(`WARNING: Could not write to \`${configFilePath}\`. Your configuration will not be persisted.`);
					});
			});

			describe('in interactive mode', () => {
				before(() => {
					process.env.NON_INTERACTIVE_MODE = false;
				});

				after(() => {
					delete process.env.NON_INTERACTIVE_MODE;
				});

				it('should inform the user that the option was successfully updated.', () => {
					return vorpal.exec(command)
						.then(() => {
							(capturedOutput[1]).should.be.equal(JSON.stringify({ message: 'Successfully set json output to true.' }));
						});
				});
			});

			describe('in non-interactive mode', () => {
				before(() => {
					process.env.NON_INTERACTIVE_MODE = true;
				});

				after(() => {
					delete process.env.NON_INTERACTIVE_MODE;
				});

				it('should inform the user that the option was not successfully updated.', () => {
					return vorpal.exec(command)
						.then(() => {
							(capturedOutput[1]).should.be.equal(JSON.stringify({ message: 'Could not set json output to true.' }));
						});
				});
			});
		});
	});

	describe('options', () => {
		const nameProperty = 'name';
		const customName = 'my-custom-name';
		const setNameCommand = `set ${nameProperty} ${customName}`;
		let setNameResult;

		describe('name option', () => {
			beforeEach(() => {
				setNameResult = { message: `Successfully set ${nameProperty} to ${customName}.` };
				return vorpal.exec(setNameCommand);
			});

			it('should set name to my-custom-name in the in-memory config', () => {
				(env)
					.should.have.property(nameProperty)
					.be.equal(customName);
			});

			it('should set name to my-custom-name in the config file', () => {
				const config = readJsonSync(configFilePath);

				(config)
					.should.have.property(nameProperty)
					.be.equal(customName);
			});

			it('should inform the user that the config name has been updated to my-custom-name', () => {
				(capturedOutput[0]).should.be.equal(JSON.stringify(setNameResult));
			});
		});

		describe('json option', () => {
			const setJsonTrueCommand = 'set json true';
			const setJsonFalseCommand = 'set json false';
			const invalidValueCommand = 'set json tru';
			let setJsonTrueResult;
			let setJsonFalseResult;
			let invalidValueResult;
			const jsonProperty = 'json';

			describe('to a non-boolean value', () => {
				beforeEach(() => {
					setJsonTrueResult = { message: 'Successfully set json output to true.' };
					setJsonFalseResult = { message: 'Successfully set json output to false.' };
					invalidValueResult = { message: 'Cannot set json output to tru.' };
					return vorpal.exec(setJsonTrueCommand)
						.then(vorpal.exec.bind(vorpal, invalidValueCommand));
				});

				it('should not change the value of json in the in-memory config', () => {
					(env)
						.should.have.property(jsonProperty)
						.be.true();
				});

				it('should not change the value of json in the config file', () => {
					const config = readJsonSync(configFilePath);

					(config)
						.should.have.property(jsonProperty)
						.be.true();
				});

				it('should inform the user that the config has not been updated', () => {
					(capturedOutput[1]).should.be.equal(JSON.stringify(invalidValueResult));
				});
			});

			describe('to true', () => {
				beforeEach(() => {
					return vorpal.exec(setJsonTrueCommand);
				});

				it('should set json to true in the in-memory config', () => {
					(env)
						.should.have.property(jsonProperty)
						.be.true();
				});

				it('should set json to true in the config file', () => {
					const config = readJsonSync(configFilePath);

					(config)
						.should.have.property(jsonProperty)
						.be.true();
				});

				it('should inform the user that the config has been updated to true', () => {
					(capturedOutput[0]).should.be.equal(JSON.stringify(setJsonTrueResult));
				});
			});

			describe('to false', () => {
				beforeEach(() => {
					return vorpal.exec(setJsonFalseCommand);
				});

				it('should set json to false in the in-memory config', () => {
					(env)
						.should.have.property(jsonProperty)
						.be.false();
				});

				it('should set json to false in the config file', () => {
					const config = readJsonSync(configFilePath);

					(config)
						.should.have.property(jsonProperty)
						.be.false();
				});

				it('should inform the user that the config has been updated to false', () => {
					(capturedOutput[0]).should.be.equal(tablify(setJsonFalseResult).toString());
				});
			});
		});

		describe('testnet option', () => {
			const setTestnetTrueCommand = 'set testnet true';
			const setTestnetFalseCommand = 'set testnet false';
			const invalidValueCommand = 'set testnet tru';
			let setTestnetTrueResult;
			let setTestnetFalseResult;
			let invalidValueResult;
			const testnetProperties = ['liskJS', 'testnet'];

			let setTestnetStub;

			beforeEach(() => {
				setTestnetTrueResult = { message: 'Successfully set testnet to true.' };
				setTestnetFalseResult = { message: 'Successfully set testnet to false.' };
				invalidValueResult = { message: 'Cannot set testnet to tru.' };
				setTestnetStub = sandbox.stub(liskInstance, 'setTestnet');
			});

			describe('to a non-boolean value', () => {
				beforeEach(() => {
					return vorpal.exec(setTestnetTrueCommand)
						.then(vorpal.exec.bind(vorpal, invalidValueCommand));
				});

				it('should not change the value of testnet on the lisk instance', () => {
					(setTestnetStub.calledTwice).should.be.false();
				});

				it('should not change the value of testnet in the config file', () => {
					const config = readJsonSync(configFilePath);

					(config)
						.should.have.property(testnetProperties[0])
						.have.property(testnetProperties[1])
						.be.true();
				});

				it('should not change the value of testnet in the in-memory config', () => {
					(env)
						.should.have.property(testnetProperties[0])
						.have.property(testnetProperties[1])
						.be.true();
				});

				it('should inform the user that the config has not been updated', () => {
					(capturedOutput[1]).should.be.equal(tablify(invalidValueResult).toString());
				});
			});

			describe('to true', () => {
				beforeEach(() => {
					return vorpal.exec(setTestnetTrueCommand);
				});

				it('should set testnet to true on the lisk instance', () => {
					(setTestnetStub.calledWithExactly(true)).should.be.true();
				});

				it('should set json to true in the in-memory config', () => {
					(env)
						.should.have.property(testnetProperties[0])
						.have.property(testnetProperties[1])
						.be.true();
				});

				it('should set testnet to true in the config file', () => {
					const config = readJsonSync(configFilePath);

					(config)
						.should.have.property(testnetProperties[0])
						.have.property(testnetProperties[1])
						.be.true();
				});

				it('should inform the user that the config has been updated to true', () => {
					(capturedOutput[0]).should.be.equal(tablify(setTestnetTrueResult).toString());
				});
			});

			describe('to false', () => {
				beforeEach(() => {
					return vorpal.exec(setTestnetFalseCommand);
				});

				it('should set testnet to false on the lisk instance', () => {
					(setTestnetStub.calledWithExactly(false)).should.be.true();
				});

				it('should set json to false in the in-memory config', () => {
					(env)
						.should.have.property(testnetProperties[0])
						.have.property(testnetProperties[1])
						.be.false();
				});

				it('should set testnet to false in the config file', () => {
					const config = readJsonSync(configFilePath);

					(config)
						.should.have.property(testnetProperties[0])
						.have.property(testnetProperties[1])
						.be.false();
				});

				it('should inform the user that the config has been updated to false', () => {
					(capturedOutput[0]).should.be.equal(tablify(setTestnetFalseResult).toString());
				});
			});
		});
	});
});
