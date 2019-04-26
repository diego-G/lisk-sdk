import { expect } from 'chai';
import {
	isCacheRunning,
	startCache,
	stopCache,
} from '../../../src/utils/node/cache';
import { NETWORK } from '../../../src/utils/constants';
import * as workerProcess from '../../../src/utils/worker-process';
import * as nodeConfig from '../../../src/utils/node/config';
import * as pm2 from '../../../src/utils/node/pm2';

describe('cache node utils', () => {
	let pm2Stub: any = null;

	beforeEach(() => {
		pm2Stub = sandbox.stub(pm2, 'describeApplication');
		pm2Stub.resolves({
			pm2_env: {
				LISK_REDIS_PORT: 6380,
			},
		});
	});

	describe('#isCacheRunning', () => {
		let workerProcessStub: any = null;
		beforeEach(() => {
			workerProcessStub = sandbox.stub(workerProcess, 'exec');
		});

		describe('when redis server is not installed', () => {
			it('should return false', async () => {
				workerProcessStub.resolves({
					stdout: 'redis not installed',
					stderr: 'redis not installed',
				});

				const status = await isCacheRunning('/tmp/dummypath', 'test');
				return expect(status).to.be.false;
			});
		});

		describe('when redis server is installed', () => {
			it('should return true', async () => {
				workerProcessStub.resolves({ stdout: 'PONG', stderr: null });
				pm2Stub.resolves({
					pm2_env: {
						LISK_REDIS_PORT: 6380,
					},
				});

				const status = await isCacheRunning('/tmp/dummypath', 'test');
				return expect(status).to.be.true;
			});
		});
	});

	describe('#startCache', () => {
		let workerProcessStub: any = null;
		beforeEach(() => {
			workerProcessStub = sandbox.stub(workerProcess, 'exec');
		});

		describe('when installation does not exists', () => {
			it('should throw error', () => {
				workerProcessStub.resolves({ stderr: 'Command failed' });

				return expect(startCache('/tmp/dummypath', 'test')).to.rejectedWith(
					'Command failed',
				);
			});
		});

		describe('when installation exists', () => {
			it('should start successfully', async () => {
				workerProcessStub.resolves({ stdout: '', stderr: null });

				const status = await startCache('/tmp/dummypath', 'test');
				return expect(status).to.equal(
					'[+] Redis-Server started successfully.',
				);
			});

			it('should throw error when failed to stop', () => {
				workerProcessStub.resolves({
					stdout: 'Failed to start redis',
					stderr: 'Failed to start redis',
				});

				return expect(startCache('/tmp/dummypath', 'test')).to.rejectedWith(
					'[-] Failed to start Redis-Server',
				);
			});
		});
	});

	describe('#stopCache', () => {
		describe('when installation does not exists', () => {
			it('should throw error', () => {
				return expect(
					stopCache('/tmp/dummypath', NETWORK.MAINNET, 'test'),
				).to.rejectedWith('Config file not exists in path');
			});
		});

		describe('when installation exists', () => {
			let configStub: any = null;
			let workerProcessStub: any = null;
			beforeEach(() => {
				configStub = sandbox.stub(nodeConfig, 'getCacheConfig');
				workerProcessStub = sandbox.stub(workerProcess, 'exec');
			});

			it('should stop successfully when password is empty', async () => {
				configStub.returns({ password: null });
				workerProcessStub.resolves({ stdout: '', stderr: null });

				const status = await stopCache(
					'/tmp/dummypath',
					NETWORK.MAINNET,
					'test',
				);
				return expect(status).to.equal(
					'[+] Redis-Server stopped successfully.',
				);
			});

			it('should stop successfully when password is present', async () => {
				configStub.returns({ password: 'lisk' });
				workerProcessStub.resolves({ stdout: '', stderr: null });

				const status = await stopCache(
					'/tmp/dummypath',
					NETWORK.MAINNET,
					'test',
				);
				return expect(status).to.equal(
					'[+] Redis-Server stopped successfully.',
				);
			});

			it('should throw error when failed to stop', () => {
				configStub.returns({ password: 'lisk' });
				workerProcessStub.resolves({
					stdout: 'Failed to stop redis',
					stderr: 'Failed to stop redis',
				});

				return expect(
					stopCache('/tmp/dummypath', NETWORK.MAINNET, 'test'),
				).to.rejectedWith('[-] Failed to stop Redis-Server');
			});
		});
	});
});
