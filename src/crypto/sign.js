/*
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
import crypto from 'crypto';
import { getTransactionBytes } from '../transactions/transactionBytes';
import {
	hexToBuffer,
	bufferToHex,
	convertPrivateKeyEd2Curve,
	convertPublicKeyEd2Curve,
} from './convert';
import {
	getRawPrivateAndPublicKeyFromSecret,
	getPrivateAndPublicKeyFromSecret,
} from './keys';
import { getTransactionHash, getSha256Hash } from './hash';

/**
 * @method signMessageWithSecret
 * @param message
 * @param secret
 *
 * @return {string}
 */

export function signMessageWithSecret(message, secret) {
	const msgBytes = naclInstance.encode_utf8(message);
	const { privateKey } = getRawPrivateAndPublicKeyFromSecret(secret);

	const signedMessage = naclInstance.crypto_sign(msgBytes, privateKey);
	const hexSignedMessage = bufferToHex(signedMessage);

	return hexSignedMessage;
}

/**
 * @method signMessageWithTwoSecrets
 * @param message
 * @param secret
 * @param secondSecret
 *
 * @return {string}
 */

export function signMessageWithTwoSecrets(message, secret, secondSecret) {
	const msgBytes = naclInstance.encode_utf8(message);
	const keypairBytes = getRawPrivateAndPublicKeyFromSecret(secret);
	const secondKeypairBytes = getRawPrivateAndPublicKeyFromSecret(secondSecret);

	const signedMessage = naclInstance.crypto_sign(msgBytes, keypairBytes.privateKey);
	const doubleSignedMessage = naclInstance.crypto_sign(
		signedMessage, secondKeypairBytes.privateKey,
	);

	const hexSignedMessage = bufferToHex(doubleSignedMessage);

	return hexSignedMessage;
}

/**
 * @method verifyMessageWithPublicKey
 * @param signedMessage
 * @param publicKey
 *
 * @return {string}
 */

export function verifyMessageWithPublicKey(signedMessage, publicKey) {
	const signedMessageBytes = hexToBuffer(signedMessage);
	const publicKeyBytes = hexToBuffer(publicKey);

	if (publicKeyBytes.length !== 32) {
		throw new Error('Invalid publicKey, expected 32-byte publicKey');
	}

	const signatureVerified = naclInstance.crypto_sign_open(signedMessageBytes, publicKeyBytes);

	if (signatureVerified) {
		return naclInstance.decode_utf8(signatureVerified);
	}
	throw new Error('Invalid signature publicKey combination, cannot verify message');
}

/**
 * @method verifyMessageWithTwoPublicKeys
 * @param signedMessage
 * @param publicKey
 * @param secondPublicKey
 *
 * @return {string}
 */

export function verifyMessageWithTwoPublicKeys(signedMessage, publicKey, secondPublicKey) {
	const signedMessageBytes = hexToBuffer(signedMessage);
	const publicKeyBytes = hexToBuffer(publicKey);
	const secondPublicKeyBytes = hexToBuffer(secondPublicKey);

	if (publicKeyBytes.length !== 32) {
		throw new Error('Invalid first publicKey, expected 32-byte publicKey');
	}

	if (secondPublicKeyBytes.length !== 32) {
		throw new Error('Invalid second publicKey, expected 32-byte publicKey');
	}

	const secondSignatureVerified = naclInstance.crypto_sign_open(
		signedMessageBytes, secondPublicKeyBytes,
	);

	if (!secondSignatureVerified) {
		throw new Error('Invalid signature second publicKey, cannot verify message');
	}

	const firstSignatureVerified = naclInstance.crypto_sign_open(
		secondSignatureVerified, publicKeyBytes,
	);

	if (!firstSignatureVerified) {
		throw new Error('Invalid signature first publicKey, cannot verify message');
	}
	return naclInstance.decode_utf8(firstSignatureVerified);
}

/**
 * @method printSignedMessage
 * @param message
 * @param signedMessage
 * @param publicKey
 *
 * @return {string}
 */

export function printSignedMessage(message, signedMessage, publicKey) {
	const signedMessageHeader = '-----BEGIN LISK SIGNED MESSAGE-----';
	const messageHeader = '-----MESSAGE-----';
	const publicKeyHeader = '-----PUBLIC KEY-----';
	const signatureHeader = '-----SIGNATURE-----';
	const signatureFooter = '-----END LISK SIGNED MESSAGE-----';

	const outputArray = [
		signedMessageHeader,
		messageHeader,
		message,
		publicKeyHeader,
		publicKey,
		signatureHeader,
		signedMessage,
		signatureFooter,
	];

	return outputArray.join('\n');
}

/**
 * @method signAndPrintMessage
 * @param message
 * @param secret
 *
 * @return {string}
 */

export function signAndPrintMessage(message, secret) {
	const { publicKey } = getPrivateAndPublicKeyFromSecret(secret);
	const signedMessage = signMessageWithSecret(message, secret);

	return printSignedMessage(message, signedMessage, publicKey);
}

/**
 * @method encryptMessageWithSecret
 * @param message
 * @param secret
 * @param recipientPublicKey
 *
 * @return {object}
 */

export function encryptMessageWithSecret(message, secret, recipientPublicKey) {
	const senderPrivateKeyBytes = getRawPrivateAndPublicKeyFromSecret(secret).privateKey;
	const convertedPrivateKey = convertPrivateKeyEd2Curve(senderPrivateKeyBytes);
	const recipientPublicKeyBytes = hexToBuffer(recipientPublicKey);
	const convertedPublicKey = convertPublicKeyEd2Curve(recipientPublicKeyBytes);
	const messageInBytes = naclInstance.encode_utf8(message);

	const nonce = naclInstance.crypto_box_random_nonce();
	const cipherBytes = naclInstance.crypto_box(
		messageInBytes, nonce, convertedPublicKey, convertedPrivateKey,
	);

	const nonceHex = bufferToHex(nonce);
	const encryptedMessage = bufferToHex(cipherBytes);

	return {
		nonce: nonceHex,
		encryptedMessage,
	};
}

/**
 * @method decryptMessageWithSecret
 * @param cipherHex
 * @param nonce
 * @param secret
 * @param senderPublicKey
 *
 * @return {string}
 */

export function decryptMessageWithSecret(cipherHex, nonce, secret, senderPublicKey) {
	const recipientPrivateKeyBytes = getRawPrivateAndPublicKeyFromSecret(secret).privateKey;
	const convertedPrivateKey = convertPrivateKeyEd2Curve(recipientPrivateKeyBytes);
	const senderPublicKeyBytes = hexToBuffer(senderPublicKey);
	const convertedPublicKey = convertPublicKeyEd2Curve(senderPublicKeyBytes);
	const cipherBytes = hexToBuffer(cipherHex);
	const nonceBytes = hexToBuffer(nonce);

	const decoded = naclInstance.crypto_box_open(
		cipherBytes, nonceBytes, convertedPublicKey, convertedPrivateKey,
	);

	return naclInstance.decode_utf8(decoded);
}

/**
 * @method signTransaction
 * @param transaction Object
 * @param secret Object
 *
 * @return {string}
 */

export function signTransaction(transaction, secret) {
	const { privateKey } = getRawPrivateAndPublicKeyFromSecret(secret);
	const transactionHash = getTransactionHash(transaction);
	const signature = naclInstance.crypto_sign_detached(transactionHash, privateKey);
	return bufferToHex(signature);
}

/**
 * @method multiSignTransaction
 * @param transaction Object
 * @param secret Object
 *
 * @return {string}
 */

export function multiSignTransaction(transaction, secret) {
	const transactionToSign = Object.assign({}, transaction);
	delete transactionToSign.signature;
	delete transactionToSign.signSignature;
	const { privateKey } = getRawPrivateAndPublicKeyFromSecret(secret);
	const bytes = getTransactionBytes(transactionToSign);
	const transactionHash = getSha256Hash(bytes);
	const signature = naclInstance.crypto_sign_detached(
		transactionHash, privateKey,
	);

	return bufferToHex(signature);
}

/**
 * @method verifyTransaction
 * @param transaction Object
 * @param secondPublicKey
 *
 * @return {boolean}
 */

export function verifyTransaction(transaction, secondPublicKey) {
	const secondSignaturePresent = !!transaction.signSignature;
	if (secondSignaturePresent && !secondPublicKey) {
		throw new Error('Cannot verify signSignature without secondPublicKey.');
	}

	const transactionWithoutSignature = Object.assign({}, transaction);

	if (secondSignaturePresent) {
		delete transactionWithoutSignature.signSignature;
	} else {
		delete transactionWithoutSignature.signature;
	}

	const transactionBytes = getTransactionBytes(transactionWithoutSignature);

	const publicKey = secondSignaturePresent ? secondPublicKey : transaction.senderPublicKey;
	const signature = secondSignaturePresent ? transaction.signSignature : transaction.signature;

	const verified = naclInstance.crypto_sign_verify_detached(
		hexToBuffer(signature), getSha256Hash(transactionBytes), hexToBuffer(publicKey),
	);

	return secondSignaturePresent ? verifyTransaction(transactionWithoutSignature) : verified;
}

/**
 * @method encryptPassphraseWithPassword
 * @param plaintext
 * @param password
 *
 * @return {string}
 */

export function encryptPassphraseWithPassword(plaintext, password) {
	const iv = crypto.randomBytes(16);
	const passHash = getSha256Hash(password, 'utf8');
	const cipherInit = crypto.createCipheriv('aes-256-cbc', passHash, iv);
	const textCipher = cipherInit.update(plaintext);
	const finishedCipher = Buffer.concat([textCipher, cipherInit.final()]);
	const cipherText = ''.concat(iv.toString('hex'), '$', finishedCipher.toString('hex'));

	return cipherText;
}

/**
 * @method decryptPassphraseWithPassword
 * @param cipherText
 * @param password
 *
 * @return {string}
 */

export function decryptPassphraseWithPassword(cipherText, password) {
	const passHash = getSha256Hash(password, 'utf8');
	const encryptedParts = cipherText.split('$');
	const iv = Buffer.from(encryptedParts.shift(), 'hex');
	const encryptedPass = Buffer.from(encryptedParts.join('$'), 'hex');
	const decipherInit = crypto.createDecipheriv('aes-256-cbc', Buffer.from(passHash), iv);
	const decryptedPass = decipherInit.update(encryptedPass);
	const decrypted = Buffer.concat([decryptedPass, decipherInit.final()]);

	return decrypted.toString();
}
