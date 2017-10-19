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
import readline from 'readline';
import lisk from 'lisk-js';
import Vorpal from 'vorpal';
import defaultConfig from '../../defaultConfig.json';
import cryptoInstance from '../../src/utils/cryptoModule';
import * as env from '../../src/utils/env';
import * as fsUtils from '../../src/utils/fs';
import { shouldUseJsonOutput } from '../../src/utils/helpers';
import liskInstance from '../../src/utils/liskInstance';
import * as mnemonicInstance from '../../src/utils/mnemonic';
import commonOptions from '../../src/utils/options';
import queryInstance from '../../src/utils/query';
import {
	DEFAULT_ERROR_MESSAGE,
	getFirstQuotedString,
	getQuotedStrings,
	getActionCreator,
	createFakeInterface,
	createStreamStub,
} from './utils';

const envToStub = require('../../src/utils/env');

export function inputs() {
	this.test.ctx.inputs = getQuotedStrings(this.test.parent.title);
}

export function anInput() {
	const input = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.input = input;
}

export function aType() {
	const type = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.type = type;
}

export const anUnknownType = aType;

export function vorpalIsInInteractiveMode() {
	delete process.env.NON_INTERACTIVE_MODE;
}

export function vorpalIsInNonInteractiveMode() {
	process.env.NON_INTERACTIVE_MODE = true;
}

export function theConfigFileCanBeWritten() {}

export function theConfigFileCannotBeWritten() {
	fsUtils.writeJsonSync.throws('EACCES: permission denied');
}

export function aValue() {
	const value = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.value = value;
}

export const anUnknownValue = aValue;

export function aVariable() {
	const variable = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.variable = variable;
}

export const anUnknownVariable = aVariable;

export function anAction() {
	const actionName = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.action = getActionCreator(actionName)();
}

export function anOptionsListIncluding() {
	const options = getQuotedStrings(this.test.parent.title);
	this.test.ctx.optionsList = options.map(optionName => commonOptions[optionName]);
}

export function aDescription() {
	this.test.ctx.description = getFirstQuotedString(this.test.parent.title);
}

export function anAutocompleteListIncluding() {
	this.test.ctx.autocompleteList = getQuotedStrings(this.test.parent.title);
}

export function aCommand() {
	this.test.ctx.command = getFirstQuotedString(this.test.parent.title);
}

export function anActionCreatorThatCreatesAnActionThatResolvesToAnObject() {
	const testObject = {
		lisk: 'js',
		testing: 123,
	};
	this.test.ctx.testObject = testObject;
	this.test.ctx.actionCreator = sandbox.stub().returns(sandbox.stub().resolves(testObject));
}

export function anActionCreatorThatCreatesAnActionThatRejectsWithAnError() {
	this.test.ctx.errorMessage = DEFAULT_ERROR_MESSAGE;
	this.test.ctx.actionCreator = sandbox.stub().returns(sandbox.stub().rejects(new Error(DEFAULT_ERROR_MESSAGE)));
}

export function aParametersObjectWithTheOptions() {
	const { options } = this.test.ctx;
	this.test.ctx.parameters = { options };
}

export function aValidMnemonicPassphrase() {
	this.test.ctx.mnemonicPassphrase = getFirstQuotedString(this.test.parent.title);
}

export function anInvalidMnemonicPassphrase() {
	this.test.ctx.mnemonicPassphrase = getFirstQuotedString(this.test.parent.title);
}

export function thePassphraseIsGeneratedByTheCreateMnemonicPassphraseFunction() {
	sandbox.stub(mnemonicInstance, 'createMnemonicPassphrase').returns(this.test.ctx.passphrase);
}

export function aVorpalInstance() {
	const vorpal = new Vorpal();
	const capturedOutput = [];
	const handleOutput = output => capturedOutput.push(output);
	vorpal.pipe((outputs) => {
		if (capturedOutput) {
			outputs.forEach(handleOutput);
		}
		return '';
	});
	this.test.ctx.capturedOutput = capturedOutput;
	this.test.ctx.vorpal = vorpal;
}

export function thereIsAVorpalInstanceWithAnActiveCommandThatCanLog() {
	this.test.ctx.vorpal = {
		activeCommand: {
			log: sandbox.spy(),
		},
	};
}

export function aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt() {
	const { passphrase } = this.test.ctx;
	this.test.ctx.vorpal = {
		ui: {},
		activeCommand: {
			prompt: sandbox.stub().onFirstCall().resolves({ passphrase }),
		},
	};
}

export function thereIsAResultToPrint() {
	this.test.ctx.result = { lisk: 'JS' };
}

export function aLiskInstance() {
	this.test.ctx.liskInstance = liskInstance;
}

export function aQueryInstanceHasBeenInitialised() {
	const queryResult = {
		some: 'result',
		testing: 123,
	};
	sandbox.stub(queryInstance, 'isAccountQuery').resolves({ account: queryResult });
	sandbox.stub(queryInstance, 'isBlockQuery').resolves({ block: queryResult });
	sandbox.stub(queryInstance, 'isDelegateQuery').resolves({ delegate: queryResult });
	sandbox.stub(queryInstance, 'isTransactionQuery').resolves({ transaction: queryResult });

	this.test.ctx.queryResult = queryResult;
	this.test.ctx.queryInstance = queryInstance;
}

export function aQueryInstance() {
	this.test.ctx.queryInstance = queryInstance;
	sandbox.stub(liskInstance, 'sendRequest');
}

export function aBlockID() {
	this.test.ctx.blockID = getFirstQuotedString(this.test.parent.title);
}

export function anAddress() {
	this.test.ctx.address = getFirstQuotedString(this.test.parent.title);
}

export function aTransactionID() {
	this.test.ctx.transactionId = getFirstQuotedString(this.test.parent.title);
}

export function aDelegateUsername() {
	this.test.ctx.delegateUsername = getFirstQuotedString(this.test.parent.title);
}

export function thereIsAFileWithUtf8EncodedJSONContentsAtPath() {
	const fileContents = '{\n\t"lisk": "js",\n\t"version": 1\n}';
	const parsedFileContents = {
		lisk: 'js',
		version: 1,
	};

	sandbox.stub(JSON, 'parse').returns(parsedFileContents);
	sandbox.stub(fs, 'readFileSync').returns(fileContents);

	this.test.ctx.filePath = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.fileContents = fileContents;
	this.test.ctx.parsedFileContents = parsedFileContents;
}

export function theFileHasABOM() {
	const BOM = '\uFEFF';
	const fileContents = `${BOM}${this.test.ctx.fileContents}`;

	fs.readFileSync.returns(fileContents);

	this.test.ctx.fileContents = fileContents;
}

export function thereIsAnObjectThatShouldBeWrittenToPath() {
	const objectToWrite = {
		lisk: 'js',
		version: 1,
	};
	const stringifiedObject = '{\n\t"lisk": "js",\n\t"version": 1\n}';

	sandbox.stub(JSON, 'stringify').returns(stringifiedObject);
	sandbox.stub(fs, 'writeFileSync');

	this.test.ctx.filePath = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.objectToWrite = objectToWrite;
	this.test.ctx.stringifiedObject = stringifiedObject;
}

export function anEmptyObject() {
	this.test.ctx.testObject = {};
}

export function aNonEmptyObject() {
	this.test.ctx.testObject = {
		lisk: 'js',
		version: 1,
	};
}

export function aNestedObject() {
	this.test.ctx.testObject = {
		root: 'value',
		nested: {
			object: 'values',
			testing: 123,
			nullValue: null,
		},
	};
}

export function anArrayOfObjectsWithTheSameKeys() {
	this.test.ctx.testArray = [
		{
			lisk: 'js',
			version: 1,
		},
		{
			lisk: 'ts',
			version: 2,
		},
		{
			lisk: 'jsx',
			version: 3,
		},
	];
}

export function anArrayOfObjectsWithDivergentKeys() {
	this.test.ctx.testArray = [
		{
			lisk: 'js',
			version: 1,
		},
		{
			lisky: 'ts',
			version: 2,
		},
		{
			nano: 'jsx',
			react: true,
		},
	];
}

export function aCryptoInstance() {
	[
		'getKeys',
		'encryptPassphraseWithPassword',
		'decryptPassphraseWithPassword',
		'encryptMessageWithSecret',
		'decryptMessageWithSecret',
		'getAddressFromPublicKey',
	].forEach(methodName => sandbox.stub(lisk.crypto, methodName));

	this.test.ctx.cryptoInstance = cryptoInstance;
}

export function aPassphrase() {
	this.test.ctx.passphrase = getFirstQuotedString(this.test.parent.title);
}

export function aPassphraseWithPrivateKeyAndPublicKeyAndAddress() {
	const [passphrase, privateKey, publicKey, address] = getQuotedStrings(this.test.parent.title);
	const keys = {
		privateKey,
		publicKey,
	};

	lisk.crypto.getKeys.returns(keys);
	lisk.crypto.decryptPassphraseWithPassword.returns(passphrase);
	lisk.crypto.getAddressFromPublicKey.returns(address);

	this.test.ctx.passphrase = passphrase;
	this.test.ctx.keys = keys;
	this.test.ctx.address = address;
}

export function aPassword() {
	this.test.ctx.password = getFirstQuotedString(this.test.parent.title);
}

export function anEncryptedPassphraseWithAnIV() {
	const [encryptedPassphrase, iv] = getQuotedStrings(this.test.parent.title);
	const cipherAndIv = {
		cipher: encryptedPassphrase,
		iv,
	};

	lisk.crypto.encryptPassphraseWithPassword.returns(cipherAndIv);

	this.test.ctx.cipherAndIv = cipherAndIv;
}

export function aMessage() {
	const message = getFirstQuotedString(this.test.parent.title);

	lisk.crypto.decryptMessageWithSecret.returns(message);

	this.test.ctx.message = message;
}

export function aRecipientPassphraseWithPrivateKeyAndPublicKey() {
	const [passphrase, privateKey, publicKey] = getQuotedStrings(this.test.parent.title);
	this.test.ctx.recipientPassphrase = passphrase;
	this.test.ctx.recipientKeys = {
		privateKey,
		publicKey,
	};
}

export function anEncryptedMessageWithANonce() {
	const [encryptedMessage, nonce] = getQuotedStrings(this.test.parent.title);
	const encryptedMessageWithNonce = {
		encryptedMessage,
		nonce,
	};

	lisk.crypto.encryptMessageWithSecret.returns(encryptedMessageWithNonce);

	this.test.ctx.encryptedMessageWithNonce = encryptedMessageWithNonce;
}

export function aConfig() {
	const config = {
		name: 'testy',
		json: true,
		liskJS: {
			testnet: false,
			node: 'localhost',
			port: 7357,
			ssl: true,
		},
	};
	envToStub.default = config;
	this.test.ctx.config = config;
}

export function aDefaultConfig() {
	this.test.ctx.defaultConfig = defaultConfig;
}

export function aDirectoryPath() {
	this.test.ctx.directoryPath = getFirstQuotedString(this.test.parent.title);
}

export function aConfigFileName() {
	const { directoryPath } = this.test.ctx;
	const configFileName = getFirstQuotedString(this.test.parent.title);

	this.test.ctx.configFileName = configFileName;
	this.test.ctx.filePath = `${directoryPath}/${configFileName}`;
}

export function theDirectoryDoesNotExist() {
	const { directoryPath } = this.test.ctx;
	fs.existsSync.withArgs(directoryPath).returns(false);
	fsUtils.readJsonSync.throws('Cannot read file');
}

export function theDirectoryDoesExist() {
	const { directoryPath } = this.test.ctx;
	fs.existsSync.withArgs(directoryPath).returns(true);
}

export function theDirectoryCannotBeCreated() {
	fs.mkdirSync.throws('Cannot make directory');
}

export function theDirectoryCanBeCreated() {}

export function theFileDoesNotExist() {
	const { filePath } = this.test.ctx;
	const error = new Error('ENOENT: no such file or directory');
	const streamStub = createStreamStub((type, callback) => type === 'error' && callback(error));

	fs.existsSync.withArgs(filePath).returns(false);
	fs.readFileSync.throws(error);
	fs.createReadStream.returns(streamStub);
	fsUtils.readJsonSync.throws('Cannot read file');
}

export function theFileDoesExist() {
	const { filePath } = this.test.ctx;
	fs.existsSync.withArgs(filePath).returns(true);
}

export function theFileCannotBeWritten() {
	fsUtils.writeJsonSync.throws('Cannot write to file');
}

export function theFileCanBeWritten() {}

export function theFileCannotBeRead() {
	const { filePath } = this.test.ctx;
	const error = new Error('EACCES: permission denied');
	const streamStub = createStreamStub((type, callback) => type === 'error' && callback(error));

	fs.accessSync.withArgs(filePath, fs.constants.R_OK).throws('Cannot read file');
	fs.readFileSync.throws(error);
	fs.createReadStream.returns(streamStub);
	fsUtils.readJsonSync.throws('Cannot read file');
}

export function theFileCanBeRead() {
	const { fileContents } = this.test.ctx;
	const streamStub = createStreamStub((type, callback) => type === 'data' && setImmediate(() => callback(fileContents)));

	fs.createReadStream.returns(streamStub);
	fs.readFileSync.returns(fileContents);
}

export function anUnknownErrorOccursWhenReadingTheFile() {
	const errorMessage = getFirstQuotedString(this.test.parent.title);
	const error = new Error(errorMessage);
	const streamStub = createStreamStub((type, callback) => type === 'error' && callback(error));

	fs.createReadStream.returns(streamStub);
	fs.readFileSync.throws(error);
}

export function theFileIsNotValidJSON() {
	fsUtils.readJsonSync.throws('Invalid JSON');
}

export function theFileIsValidJSON() {
	const userConfig = {
		name: 'custom-name',
		json: true,
		liskJS: {
			testnet: true,
			node: 'my-node',
			port: 7357,
			ssl: true,
		},
	};

	this.test.ctx.userConfig = userConfig;

	fsUtils.readJsonSync.returns(userConfig);
}

export function aSourceWithoutDelimiter() {
	this.test.ctx.source = getFirstQuotedString(this.test.parent.title);
}

export function aSourceWithDelimiter() {
	this.test.ctx.source = getFirstQuotedString(this.test.parent.title);
}

export function aPromptMessage() {
	this.test.ctx.promptMessage = getFirstQuotedString(this.test.parent.title);
}

export function aPromptDisplayName() {
	this.test.ctx.displayName = getFirstQuotedString(this.test.parent.title);
}

export function thePassphraseIsProvidedViaThePrompt() {
	const { passphrase } = this.test.ctx;
	this.test.ctx.vorpal.activeCommand.prompt.resolves({ passphrase });
}

export function thePassphraseShouldNotBeRepeated() {
	this.test.ctx.shouldRepeat = false;
}

export function thePassphraseShouldBeRepeated() {
	this.test.ctx.shouldRepeat = true;
}

export function theVorpalInstanceHasNoUIParent() {
	const { vorpal } = this.test.ctx;
	delete vorpal.ui.parent;
}

export function theVorpalInstanceHasAUIParent() {
	const { vorpal } = this.test.ctx;
	const parent = { existing: 'parent' };

	this.test.ctx.vorpalUIParent = parent;
	vorpal.ui.parent = parent;
}

export function thePassphraseIsNotSuccessfullyRepeated() {
	const { vorpal, passphrase } = this.test.ctx;
	vorpal.activeCommand.prompt.onSecondCall().resolves({
		passphrase: `${passphrase.slice(0, -1)}y`,
	});
}

export function thePassphraseIsSuccessfullyRepeated() {
	const { vorpal, passphrase } = this.test.ctx;
	vorpal.activeCommand.prompt.onSecondCall().resolves({ passphrase });
}

export function someData() {
	this.test.ctx.data = getFirstQuotedString(this.test.parent.title);
}

export function neitherThePassphraseNorTheDataIsProvidedViaStdIn() {
	sandbox.stub(readline, 'createInterface').returns(createFakeInterface(''));
}

export function thePassphraseIsProvidedViaStdIn() {
	const { passphrase } = this.test.ctx;

	sandbox.stub(readline, 'createInterface').returns(createFakeInterface(passphrase));

	this.test.ctx.passphraseIsRequired = true;
}

export function theDataIsProvidedViaStdIn() {
	const { data } = this.test.ctx;

	sandbox.stub(readline, 'createInterface').returns(createFakeInterface(data));

	this.test.ctx.dataIsRequired = true;
}

export function bothThePassphraseAndTheDataAreProvidedViaStdIn() {
	const { passphrase, data } = this.test.ctx;

	sandbox.stub(readline, 'createInterface').returns(createFakeInterface(`${passphrase}\n${data}`));

	this.test.ctx.passphraseIsRequired = true;
	this.test.ctx.dataIsRequired = true;
}

export function thePassphraseIsStoredInEnvironmentalVariable() {
	const { passphrase } = this.test.ctx;
	const environmentalVariableName = getFirstQuotedString(this.test.parent.title);

	process.env[environmentalVariableName] = passphrase;

	this.test.ctx.environmentalVariableName = environmentalVariableName;
	this.test.ctx.passphraseSource = `env:${environmentalVariableName}`;
}

export function environmentalVariableIsNotSet() {
	const environmentalVariableName = getFirstQuotedString(this.test.parent.title);

	delete process.env[environmentalVariableName];

	this.test.ctx.environmentalVariableName = environmentalVariableName;
}

export function aPassphraseFilePath() {
	const { passphrase } = this.test.ctx;
	const filePath = getFirstQuotedString(this.test.parent.title);

	this.test.ctx.fileContents = `${passphrase}\nSome irrelevant text\non subsequent lines\n`;
	this.test.ctx.filePath = filePath;
	this.test.ctx.passphraseSource = `file:${filePath}`;
}

export function anUnknownPassphraseSource() {
	this.test.ctx.passphraseSource = 'unknownSource';
}

export function thePassphraseIsProvidedAsPlaintext() {
	const { passphrase } = this.test.ctx;
	this.test.ctx.passphraseSource = `pass:${passphrase}`;
}

export function thereIsNoStringAvailable() {
	this.test.ctx.testString = null;
}

export function thereIsAString() {
	this.test.ctx.testString = getFirstQuotedString(this.test.parent.title);
}

export function aDataFilePath() {
	const { data } = this.test.ctx;
	const filePath = getFirstQuotedString(this.test.parent.title);

	this.test.ctx.fileContents = data;
	this.test.ctx.filePath = filePath;
}

export function noDataIsProvided() {}

export function dataIsProvidedViaStdIn() {
	const { data } = this.test.ctx;
	this.test.ctx.stdInData = data;
}

export function dataIsProvidedAsAnArgument() {
	const { data } = this.test.ctx;
	this.test.ctx.argData = data;
}

export function dataIsProvidedViaAnUnknownSource() {
	this.test.ctx.sourceData = 'unknownSource';
}

export function dataIsProvidedViaAFileSource() {
	const { filePath } = this.test.ctx;
	this.test.ctx.sourceData = `file:${filePath}`;
}

export function aTypeWithAlias() {
	const [type, alias] = getQuotedStrings(this.test.parent.title);
	this.test.ctx.type = type;
	this.test.ctx.alias = alias;
}

export function aTypeWithNoAlias() {
	const type = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.type = type;
}

export function aConfigWithJsonSetTo() {
	const stringBoolean = getFirstQuotedString(this.test.parent.title);
	const config = {
		json: stringBoolean === 'true',
	};

	env.default = config;
	this.test.ctx.config = config;
}

export function anOptionsObjectWithJsonSetTo() {
	const stringBoolean = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.options = {
		json: stringBoolean === 'true',
	};
}

export function anEmptyOptionsObject() {
	this.test.ctx.options = {};
}

export function aPrefix() {
	const prefix = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.prefix = prefix;
}

export function anObjectWithMessage() {
	const message = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.testObject = {
		message,
	};
}

export function jsonShouldBePrinted() {
	shouldUseJsonOutput.returns(true);
}

export function jsonShouldNotBePrinted() {
	shouldUseJsonOutput.returns(false);
}
