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

const child_process = require('child_process');
const find = require('find');

const maxParallelism = 20;

const executeIstanbul = (path, mochaArguments) => {
	const coverageArguments = [
		'cover',
		'--dir',
		'test/.coverage-unit',
		'--include-pid',
		'--print',
		'none',
		'node_modules/.bin/_mocha',
		path,
	];
	const istanbulArguments = coverageArguments.concat(mochaArguments);

	return child_process.spawn('node_modules/.bin/istanbul', istanbulArguments, {
		cwd: `${__dirname}/../..`,
		detached: true,
		stdio: 'inherit',
	});
};

const getSuiteFolder = (suite, section) => {
	let suiteFolder = null;

	switch (suite) {
		case 'unit':
			suiteFolder = 'test/unit/';
			break;
		case 'functional':
			switch (section) {
				case 'get':
					suiteFolder = 'test/functional/http/get/';
					break;
				case 'post':
					suiteFolder = 'test/functional/http/post/';
					break;
				case 'ws':
					suiteFolder = 'test/functional/ws/';
					break;
				case undefined:
					suiteFolder = 'test/functional/';
					break;
				default:
					console.warn('Invalid section argument. Options are: get, post, ws');
					process.exit();
					break;
			}
			break;
		case 'integration':
			suiteFolder = 'test/integration/';
			break;

		default:
			console.warn(
				'Invalid suite argument. Options are: unit, functional and integration'
			);
			process.exit();
			break;
	}
	return suiteFolder;
};

const getMochaArguments = tag => {
	const mochaArguments = [];
	switch (tag) {
		case 'slow':
			mochaArguments.push('--', '--grep', '@slow');
			break;
		case 'unstable':
			mochaArguments.push('--', '--grep', '@unstable');
			break;
		case 'standalone':
			mochaArguments.push('--', '--grep', '@standalone');
			break;
		case 'extensive':
			mochaArguments.push('--', '--grep', '@unstable|@standalone', '--invert');
			break;
		default:
			mochaArguments.push(
				'--',
				'--grep',
				'@slow|@unstable|@standalone',
				'--invert'
			);
			break;
	}
	return mochaArguments;
};

const spawnParallelTest = (testFile, mochaArguments) => {
	return new Promise((resolve, reject) => {
		const child = executeIstanbul(testFile, mochaArguments);

		console.info(
			`Running parallel the test: ${testFile} as a separate process - pid: ${
				child.pid
			}`
		);

		child.on('close', code => {
			if (code === 0) {
				console.info(`Test finished successfully: ${testFile}`);
				resolve(testFile);
				return child.kill('SIGTERM');
			}

			console.error('Test failed:', testFile);
			reject(code);
			return process.exit(code);
		});

		child.on('error', err => {
			console.error(err);
			reject(err);
			process.exit();
		});
	});
};

const runParallelTests = (suiteFolder, mochaArguments) => {
	return new Promise((resolve, reject) => {
		// Looking recursevely for javascript files not containing the word "common"
		const allFiles = find.fileSync(/^((?!common)[\s\S])*.js$/, suiteFolder);
		const allFilesLength = allFiles.length;

		const completedFiles = {};

		const next = () => {
			const testFile = allFiles.splice(0, 1);
			spawnParallelTest(testFile, mochaArguments)
				.then(testFile => {
					completedFiles[testFile] = 'done';
					if (
						allFiles.length === 0 &&
						Object.keys(completedFiles).length === allFilesLength
					) {
						console.info('All parallel tests finished successfully.');
						return resolve('All parallel tests finished successfully.');
					}

					if (allFiles.length > 0) {
						return next();
					}
				})
				.catch(err => {
					console.error(`Parallel test failed: ${testFile}`);
					return reject(err);
				});
		};

		for (
			let i = 0, limit = Math.min(allFilesLength, maxParallelism);
			i < limit;
			i += 1
		) {
			next();
		}
	});
};

const runStandaloneTests = (suiteFolder, mochaArguments) => {
	return new Promise((resolve, reject) => {
		const child = executeIstanbul(suiteFolder, mochaArguments);
		child.on('close', code => {
			if (code === 0) {
				console.info('All standalone tests finished successfully.');
				return resolve();
			}

			console.error('Standalone tests failed:', suiteFolder);
			child.kill('SIGTERM');
			reject(code);
			return process.exit(code);
		});

		child.on('error', err => {
			console.error(err);
			child.kill('SIGTERM');
			reject(err);
			return process.exit();
		});
	});
};

function executeTests(tag, suite, section) {
	return new Promise(async (resolve, reject) => {
		console.info('Executing tests with following configuration:', {
			tag,
			suite,
			section,
		});
		const suiteFolder = getSuiteFolder(suite, section);
		const mochaArguments = getMochaArguments(tag);

		if (tag !== 'standalone') {
			try {
				const result = await runParallelTests(suiteFolder, mochaArguments);
				return resolve(result);
			} catch (err) {
				console.error('Parallel tests failed!', err);
				return reject(err);
			}
		} else {
			try {
				const result = await runStandaloneTests(suiteFolder, mochaArguments);
				return resolve(result);
			} catch (err) {
				console.error('Standalone tests failed!', err);
				return reject(err);
			}
		}
	});
}

(async () => {
	await executeTests(process.argv[2], process.argv[3], process.argv[4]);
	if (process.argv[2] !== 'standalone') {
		await executeTests('standalone', process.argv[3], process.argv[4]);
	}
})();

module.exports = {
	executeTests,
};
