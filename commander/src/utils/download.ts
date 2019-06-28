/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import * as axios from 'axios';
import crypto from 'crypto';
import fs from 'fs-extra';
import * as tar from 'tar';
import { dateDiff, getDownloadedFileInfo } from './core/commons';

export const verifyChecksum = async (
	filePath: string,
	expectedChecksum: string,
): Promise<boolean> => {
	const shasum = crypto.createHash('sha256');
	const fileStream = fs.createReadStream(filePath);

	return new Promise((resolve, reject) => {
		fileStream.on('data', (d: Buffer) => {
			shasum.update(d);
		});
		fileStream.on('end', () => {
			const fileChecksum = shasum.digest('hex');
			if (fileChecksum === expectedChecksum) {
				return resolve(true);
			}

			return reject(
				`file checksum: ${fileChecksum} mismatched with expected checksum: ${expectedChecksum}`,
			);
		});
	});
};

export const download = async (
	url: string,
	cacheDir: string,
): Promise<void> => {
	const CACHE_EXPIRY_IN_DAYS = 2;
	const { filePath, fileDir } = getDownloadedFileInfo(url, cacheDir);

	if (fs.existsSync(filePath)) {
		if (
			dateDiff(new Date(), fs.statSync(filePath).birthtime) <=
			CACHE_EXPIRY_IN_DAYS
		) {
			return;
		}
		fs.unlinkSync(filePath);
	}

	fs.ensureDirSync(fileDir);
	const writeStream = fs.createWriteStream(filePath);
	const response = await axios.default({
		url,
		method: 'GET',
		responseType: 'stream',
	});

	response.data.pipe(writeStream);

	return new Promise<void>((resolve, reject) => {
		writeStream.on('finish', resolve);
		writeStream.on('error', reject);
	});
};

export const extract = async (
	filePath: string,
	fileName: string,
	outDir: string,
): Promise<void> =>
	tar.x({
		file: `${filePath}/${fileName}`,
		cwd: outDir,
		strip: 1,
	});

export const downloadAndValidate = async (url: string, cacheDir: string) => {
	await download(url, cacheDir);
	await download(`${url}.SHA256`, cacheDir);

	const { filePath } = getDownloadedFileInfo(url, cacheDir);
	const content = fs.readFileSync(`${filePath}.SHA256`, 'utf8');
	const checksum = content.split(' ')[0];

	await verifyChecksum(filePath, checksum);
};
