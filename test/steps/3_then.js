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
import lisk from 'lisk-js';
import * as fsUtils from '../../src/utils/fs';
import tablify from '../../src/utils/tablify';
import {
	getFirstQuotedString,
	getNumbersFromTitle,
} from './utils';
import {
	getRequiredArgs,
} from '../specs/commands/utils';

export function itShouldResolveToAnObjectWithThePassphraseAndThePublicKeyAndTheAddress() {
	const { returnValue, passphrase, keys: { publicKey }, address } = this.test.ctx;
	const expectedObject = {
		passphrase,
		publicKey,
		address,
	};
	return (returnValue).should.be.fulfilledWith(expectedObject);
}

export async function itShouldPrintTheResultAsJSON() {
	const { returnValue } = this.test.ctx;
	const result = await returnValue;
	return (JSON.stringify).should.be.calledWithExactly(result);
}

export async function itShouldPrintTheResultInATable() {
	const { returnValue } = this.test.ctx;
	const result = await returnValue;
	return (tablify).should.be.calledWithExactly(result);
}

export function theCommandShouldHaveRequiredArguments() {
	const { vorpal, command } = this.test.ctx;
	const requiredArguments = getNumbersFromTitle(this.test.title)[0];
	const vorpalRequiredArgs = getRequiredArgs(vorpal, command);
	return (vorpalRequiredArgs).should.have.length(requiredArguments);
}

export function theMnemonicPassphraseShouldBeA12WordString() {
	const { mnemonicPassphrase } = this.test.ctx;
	const mnemonicWords = mnemonicPassphrase.split(' ').filter(Boolean);
	(mnemonicWords).should.have.length(12);
}

export function liskJSCryptoShouldBeUsedToGetTheAddressFromThePublicKey() {
	const { keys: { publicKey } } = this.test.ctx;
	return (lisk.crypto.getAddressFromPublicKey).should.be.calledWithExactly(publicKey);
}

export function itShouldReturnAnObjectWithTheAddress() {
	const { returnValue, address } = this.test.ctx;
	return (returnValue).should.eql({ address });
}

export function theLiskInstanceShouldBeALiskJSApiInstance() {
	const { liskInstance } = this.test.ctx;
	return (liskInstance).should.be.instanceOf(lisk.api);
}

export function theResultShouldBeReturned() {
	const { returnValue, result } = this.test.ctx;
	return (returnValue).should.equal(result);
}

export function aTableShouldBeLogged() {
	const { result, vorpal } = this.test.ctx;
	const tableOutput = tablify(result).toString();
	return (vorpal.activeCommand.log).should.be.calledWithExactly(tableOutput);
}

export function jSONOutputShouldBeLogged() {
	const { result, vorpal } = this.test.ctx;
	const jsonOutput = JSON.stringify(result);
	return (vorpal.activeCommand.log).should.be.calledWithExactly(jsonOutput);
}

export function theLiskInstanceShouldSendARequestToTheBlocksGetAPIEndpointWithTheBlockID() {
	const { blockId, liskInstance } = this.test.ctx;
	const route = 'blocks/get';
	const options = { id: blockId };
	return (liskInstance.sendRequest).should.be.calledWithExactly(route, options);
}

export function theLiskInstanceShouldSendARequestToTheAccountsAPIEndpointWithTheAddress() {
	const { address, liskInstance } = this.test.ctx;
	const route = 'accounts';
	const options = { address };
	return (liskInstance.sendRequest).should.be.calledWithExactly(route, options);
}

export function theLiskInstanceShouldSendARequestToTheTransactionsGetAPIEndpointWithTheTransactionID() {
	const { transactionId, liskInstance } = this.test.ctx;
	const route = 'transactions/get';
	const options = { id: transactionId };
	return (liskInstance.sendRequest).should.be.calledWithExactly(route, options);
}

export function theLiskInstanceShouldSendARequestToTheDelegatesGetAPIEndpointWithTheUsername() {
	const { delegateUsername, liskInstance } = this.test.ctx;
	const route = 'delegates/get';
	const options = { username: delegateUsername };
	return (liskInstance.sendRequest).should.be.calledWithExactly(route, options);
}

export function fsReadFileSyncShouldBeCalledWithThePathAndEncoding() {
	const { filePath } = this.test.ctx;
	return (fs.readFileSync).should.be.calledWithExactly(filePath, 'utf8');
}

export function jSONParseShouldBeCalledWithTheFileContentsAsAString() {
	const { fileContents } = this.test.ctx;
	return (JSON.parse).should.be.calledWithExactly(fileContents);
}

export function jSONParseShouldBeCalledWithTheFileContentsAsAStringWithoutTheBOM() {
	const { fileContents } = this.test.ctx;
	return (JSON.parse).should.be.calledWithExactly(fileContents.slice(1));
}

export function theParsedFileContentsShouldBeReturned() {
	const { returnValue, parsedFileContents } = this.test.ctx;
	return (returnValue).should.equal(parsedFileContents);
}

export function jSONStringifyShouldBeCalledWithTheObjectUsingTabIndentation() {
	const { objectToWrite } = this.test.ctx;
	const tab = '\t';
	return (JSON.stringify).should.be.calledWithExactly(objectToWrite, null, tab);
}

export function fsWriteFileSyncShouldBeCalledWithThePathAndTheStringifiedJSON() {
	const { filePath, stringifiedObject } = this.test.ctx;
	return (fs.writeFileSync).should.be.calledWithExactly(filePath, stringifiedObject);
}

export function theReturnedTableShouldHaveNoHead() {
	const { returnValue } = this.test.ctx;
	return (returnValue.options).should.have.property('head').eql([]);
}

export function theReturnedTableShouldHaveNoRows() {
	const { returnValue } = this.test.ctx;
	return (returnValue).should.have.length(0);
}

export function theReturnedTableShouldHaveAHeadWithTheObjectKeys() {
	const { returnValue, testObject } = this.test.ctx;
	const keys = Object.keys(testObject);
	return (returnValue.options).should.have.property('head').eql(keys);
}

export function theReturnedTableShouldHaveARowWithTheObjectValues() {
	const { returnValue, testObject } = this.test.ctx;
	const values = Object.values(testObject);
	return (returnValue[0]).should.eql(values);
}

export function theReturnedTableShouldHaveAHeadWithTheObjectsKeys() {
	const { returnValue, testArray } = this.test.ctx;
	const keys = Object.keys(testArray[0]);
	return (returnValue.options).should.have.property('head').eql(keys);
}

export function theReturnedTableShouldHaveARowForEachObjectWithTheObjectValues() {
	const { returnValue, testArray } = this.test.ctx;
	testArray.forEach((testObject, i) => {
		const values = Object.values(testObject);
		(returnValue[i]).should.eql(values);
	});
}

export function theReturnedTableShouldHaveAHeadWithEveryUniqueKey() {
	const { returnValue, testArray } = this.test.ctx;
	const uniqueKeys = testArray
		.reduce((keys, testObject) => {
			const newKeys = Object.keys(testObject).filter(key => !keys.includes(key));
			return [...keys, ...newKeys];
		}, []);
	return (returnValue.options).should.have.property('head').eql(uniqueKeys);
}

export function theReturnedTableShouldHaveARowForEachObjectWithTheObjectsValues() {
	const { returnValue, testArray } = this.test.ctx;
	testArray.forEach((testObject, i) => {
		const row = returnValue[i];
		const values = Object.values(testObject);

		values.forEach(value => (row).should.containEql(value));
		row
			.filter(value => !values.includes(value))
			.forEach(value => should(value).be.undefined());
	});
}

export function theCryptoInstanceShouldHaveName() {
	const { cryptoInstance } = this.test.ctx;
	const name = getFirstQuotedString(this.test.title);
	return (cryptoInstance.constructor).should.have.property('name').equal(name);
}

export function theCryptoInstanceShouldHaveLiskJSAsAProperty() {
	const { cryptoInstance } = this.test.ctx;
	return (cryptoInstance).should.have.property('liskCrypto').equal(lisk.crypto);
}

export function liskJSCryptoShouldBeUsedToGetTheKeysForThePassphrase() {
	const { passphrase } = this.test.ctx;
	return (lisk.crypto.getKeys).should.be.calledWithExactly(passphrase);
}

export function theKeysShouldBeReturned() {
	const { returnValue, keys } = this.test.ctx;
	return (returnValue).should.eql(keys);
}

export function theErrorResponseShouldBeHandled() {
	const { returnValue, errorMessage } = this.test.ctx;
	return (returnValue).should.eql({ error: errorMessage });
}

export function liskJSCryptoShouldBeUsedToGetTheEncryptedPassphraseAndIV() {
	const { passphrase, password } = this.test.ctx;
	return (lisk.crypto.encryptPassphraseWithPassword).should.be.calledWithExactly(passphrase, password);
}

export function theEncryptedPassphraseAndIVShouldBeReturned() {
	const { returnValue, cipherAndIv } = this.test.ctx;
	return (returnValue).should.eql(cipherAndIv);
}

export function liskJSCryptoShouldBeUsedToGetTheDecryptedPassphrase() {
	const { cipherAndIv, password } = this.test.ctx;
	return (lisk.crypto.decryptPassphraseWithPassword).should.be.calledWithExactly(cipherAndIv, password);
}

export function theDecryptedPassphraseShouldBeReturned() {
	const { returnValue, passphrase } = this.test.ctx;
	return (returnValue).should.eql({ passphrase });
}

export function liskJSCryptoShouldBeUsedToGetTheEncryptedMessageAndNonce() {
	const { message, passphrase, recipientKeys } = this.test.ctx;
	return (lisk.crypto.encryptMessageWithSecret).should.be.calledWithExactly(message, passphrase, recipientKeys.publicKey);
}

export function theEncryptedMessageAndNonceShouldBeReturned() {
	const { returnValue, encryptedMessageWithNonce } = this.test.ctx;
	return (returnValue).should.eql(encryptedMessageWithNonce);
}

export function liskJSCryptoShouldBeUsedToGetTheDecryptedMessage() {
	const { encryptedMessageWithNonce: { encryptedMessage, nonce }, recipientPassphrase, keys } = this.test.ctx;
	return (lisk.crypto.decryptMessageWithSecret).should.be.calledWithExactly(encryptedMessage, nonce, recipientPassphrase, keys.publicKey);
}

export function theDecryptedMessageShouldBeReturned() {
	const { returnValue, message } = this.test.ctx;
	return (returnValue).should.eql({ message });
}

export function theDefaultConfigShouldBeExported() {
	const { config, defaultConfig } = this.test.ctx;
	return (config).should.eql(defaultConfig);
}

export function theUsersConfigShouldBeExported() {
	const { config, userConfig } = this.test.ctx;
	return (config).should.eql(userConfig);
}

export function theDefaultConfigShouldBeWrittenToTheConfigFile() {
	const { filePath, defaultConfig } = this.test.ctx;
	return (fsUtils.writeJsonSync).should.be.calledWithExactly(filePath, defaultConfig);
}

export function theConfigFileShouldNotBeWritten() {
	return (fsUtils.writeJsonSync).should.not.be.called();
}

export function theUserShouldBeWarnedThatTheConfigWillNotBePersisted() {
	return (console.warn).should.be.calledWithMatch(/Your configuration will not be persisted\./);
}

export function theUserShouldBeInformedThatTheConfigFilePermissionsAreIncorrect() {
	const { filePath } = this.test.ctx;
	return (console.error).should.be.calledWithExactly(`Could not read config file. Please check permissions for ${filePath} or delete the file so we can create a new one from defaults.`);
}

export function theUserShouldBeInformedThatTheConfigFileIsNotValidJSON() {
	const { filePath } = this.test.ctx;
	return (console.error).should.be.calledWithExactly(`Config file is not valid JSON. Please check ${filePath} or delete the file so we can create a new one from defaults.`);
}

export function theProcessShouldExitWithErrorCode() {
	const errorCode = parseInt(getFirstQuotedString(this.test.title), 10);
	return (process.exit).should.be.calledWithExactly(errorCode);
}

export function theResultShouldHaveSourceType() {
	const { returnValue } = this.test.ctx;
	const sourceType = getFirstQuotedString(this.test.title);
	return (returnValue).should.have.property('sourceType').equal(sourceType);
}

export function theResultShouldHaveAnEmptySourceIdentifier() {
	const { returnValue } = this.test.ctx;
	return (returnValue).should.have.property('sourceIdentifier').equal('');
}

export function theResultShouldHaveSourceIdentifier() {
	const { returnValue } = this.test.ctx;
	const sourceIdentifier = getFirstQuotedString(this.test.title);
	return (returnValue).should.have.property('sourceIdentifier').equal(sourceIdentifier);
}

export function anOptionsObjectWithTheMessageShouldBeReturned() {
	const { returnValue, promptMessage } = this.test.ctx;
	return (returnValue).should.eql({
		type: 'password',
		name: 'passphrase',
		message: promptMessage,
	});
}

export function aUIParentShouldBeSet() {
	const { vorpal } = this.test.ctx;
	return (vorpal.ui.parent).should.equal(vorpal);
}

export function theUIParentShouldBeMaintained() {
	const { vorpal, vorpalUIParent } = this.test.ctx;
	return (vorpal.ui.parent).should.equal(vorpalUIParent);
}

export function itShouldPromptForThePassphraseOnce() {
	const { vorpal } = this.test.ctx;
	return (vorpal.activeCommand.prompt).should.be.calledOnce();
}

export function itShouldPromptForThePassphraseTwice() {
	const { vorpal } = this.test.ctx;
	return (vorpal.activeCommand.prompt).should.be.calledTwice();
}

export function itShouldUseOptionsWithTheMessage() {
	const { vorpal } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return (vorpal.activeCommand.prompt).should.be.calledWithExactly({
		type: 'password',
		name: 'passphrase',
		message,
	});
}

export function itShouldResolveToThePassphrase() {
	const { returnValue, passphrase } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(passphrase);
}

export function itShouldRejectWithMessage() {
	const { returnValue } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return (returnValue).should.be.rejectedWith(message);
}

export function itShouldReturnAnEmptyObject() {
	const { returnValue } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith({});
}

export function itShouldReturnAnObjectWithThePassphrase() {
	const { returnValue, passphrase } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith({
		passphrase,
	});
}

export function itShouldReturnAnObjectWithTheData() {
	const { returnValue, data } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith({
		passphrase: null,
		data,
	});
}

export function itShouldReturnAnObjectWithThePassphraseAndTheData() {
	const { returnValue, passphrase, data } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith({
		passphrase,
		data,
	});
}

export function itShouldResolveToTheFirstLineOfTheFile() {
	const { returnValue, passphrase } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(passphrase);
}

export function itShouldReturnTrue() {
	const { returnValue } = this.test.ctx;
	return (returnValue).should.be.true();
}

export function itShouldReturnFalse() {
	const { returnValue } = this.test.ctx;
	return (returnValue).should.be.false();
}

export function itShouldReturnNull() {
	const { returnValue } = this.test.ctx;
	return should(returnValue).be.null();
}

export function itShouldReturnString() {
	const { returnValue } = this.test.ctx;
	const expectedString = getFirstQuotedString(this.test.title);

	return (returnValue).should.equal(expectedString);
}

export function itShouldResolveToTheDataAsAString() {
	const { returnValue, data } = this.test.ctx;
	return (returnValue).should.be.fulfilledWith(data);
}

export function itShouldReturnTheAlias() {
	const { returnValue, alias } = this.test.ctx;
	return (returnValue).should.be.equal(alias);
}

export function itShouldReturnTheType() {
	const { returnValue, type } = this.test.ctx;
	return (returnValue).should.be.equal(type);
}

export function itShouldReturnAnObjectWithError() {
	const { returnValue } = this.test.ctx;
	const error = getFirstQuotedString(this.test.title);
	return (returnValue).should.eql({
		error,
	});
}
