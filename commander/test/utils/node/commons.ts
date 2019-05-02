import { expect } from 'chai';
import fsExtra from 'fs-extra';
import * as os from 'os';
import {
	liskInstall,
	installDirectory,
	liskVersion,
	liskTar,
	liskTarSHA256,
	liskLatestUrl,
	liskSnapshotUrl,
	liskDbSnapshot,
	logsDir,
	validateNotARootUser,
	isSupportedOS,
	validateNetwork,
	createDirectory,
	validURL,
	getVersionToInstall,
	getSemver,
	backupLisk,
	upgradeLisk,
	validateVersion,
} from '../../../src/utils/node/commons';
import { NETWORK, RELEASE_URL } from '../../../src/utils/constants';
import { defaultLiskInstancePath } from '../../../src/utils/node/config';
import * as release from '../../../src/utils/node/release';
import * as workerProcess from '../../../src/utils/worker-process';

describe('commons node utils', () => {
	describe('#liskInstall', () => {
		it('should return resolved home directory', () => {
			return expect(liskInstall('~/.lisk')).to.equal(`${os.homedir}/.lisk`);
		});
	});

	describe('#installDirectory', () => {
		it('should return resolved installation directory', () => {
			return expect(installDirectory('~/.lisk', 'test')).to.equal(
				`${os.homedir}/.lisk/test`,
			);
		});
	});

	describe('#liskVersion', () => {
		it('should return lisk version', () => {
			const version = '1.0.0';
			return expect(liskVersion(version)).to.equal(
				`lisk-${version}-${os.type()}-x86_64`,
			);
		});
	});

	describe('#liskTar', () => {
		it('should return lisk tar', () => {
			const version = '1.0.0';
			return expect(liskTar(version)).to.equal(
				`lisk-${version}-${os.type()}-x86_64.tar.gz`,
			);
		});
	});

	describe('#liskTarSHA256', () => {
		it('should return lisk tar gz', () => {
			const version = '1.0.0';
			return expect(liskTarSHA256(version)).to.equal(
				`lisk-${version}-${os.type()}-x86_64.tar.gz.SHA256`,
			);
		});
	});

	describe('#liskLatestUrl', () => {
		it('should return lisk latest url', () => {
			const url: string = 'https://downloads.lisk.io/lisk/';
			return expect(liskLatestUrl(url, NETWORK.MAINNET)).to.equal(
				`${url}/${NETWORK.MAINNET}/latest.txt`,
			);
		});
	});

	describe('#liskSnapshotUrl', () => {
		it('should construct snapshot url', () => {
			const url: string =
				'https://downloads.lisk.io/lisk/mainnet/blockchain.db.gz';
			return expect(liskSnapshotUrl(url, NETWORK.MAINNET)).to.equal(
				`${RELEASE_URL}/${NETWORK.MAINNET}/blockchain.db.gz`,
			);
		});

		it('should return same url if it is a valid url', () => {
			const url: string =
				'http://snapshots.lisk.io.s3-eu-west-1.amazonaws.com/lisk/mainnet/blockchain.db.gz';
			return expect(liskSnapshotUrl(url, NETWORK.MAINNET)).to.equal(url);
		});
	});

	describe('#logsDir', () => {
		it('should return lisk latest url', () => {
			return expect(logsDir(defaultLiskInstancePath)).to.equal(
				`${liskInstall(defaultLiskInstancePath)}/logs`,
			);
		});
	});

	describe('#validateNotARootUser', () => {
		it('should throw error if user is running as root', () => {
			sandbox.stub(process, 'getuid').returns(0);

			return expect(() => validateNotARootUser()).to.throw(
				'Error: Lisk should not be run be as root. Exiting.',
			);
		});

		it('should not throw error when running user is not root', () => {
			return expect(validateNotARootUser()).not.to.throw;
		});
	});

	describe('#isSupportedOS', () => {
		it('should return true', () => {
			return expect(isSupportedOS()).to.be.true;
		});
	});

	describe('#validateNetwork', () => {
		it('should throw error for invalid network', () => {
			try {
				validateNetwork('asdf' as NETWORK);
			} catch (error) {
				expect(error.message).to.equal(
					'Network "asdf" is not supported, please try options mainnet,testnet,betanet,alphanet,devnet',
				);
			}
		});

		it('should not throw error for valid network', () => {
			expect(validateNetwork(NETWORK.MAINNET)).not.to.throw;
			expect(validateNetwork(NETWORK.TESTNET)).not.to.throw;
			return expect(validateNetwork(NETWORK.BETANET)).not.to.throw;
		});
	});

	describe('#createDirectory', () => {
		let pathExistsSyncStub: any = null;
		let ensureDirSync: any = null;
		beforeEach(() => {
			pathExistsSyncStub = sandbox.stub(fsExtra, 'pathExistsSync');
			ensureDirSync = sandbox.stub(fsExtra, 'ensureDirSync');
		});

		it('should return if the directory exists', () => {
			pathExistsSyncStub.returns(true);
			return expect(createDirectory(defaultLiskInstancePath)).not.to.throw;
		});

		it('should create directory if it does not exists', () => {
			pathExistsSyncStub.returns(false);
			ensureDirSync.returns();
			return expect(createDirectory(defaultLiskInstancePath)).not.to.throw;
		});
	});

	describe('#validURL', () => {
		it('should throw error if url is invalid', () => {
			return expect(() => validURL('dummy://download.lisk.io')).to.throw(
				'Invalid URL: dummy://download.lisk.io',
			);
		});

		it('should not throw error if url is valid', () => {
			return expect(validURL(`https://downloads.lisk.io/lisk/`)).not.to.throw;
		});
	});

	describe('#getVersionToInstall', () => {
		const version = '2.0.0';
		beforeEach(() => {
			sandbox.stub(release, 'getLatestVersion').resolves(version);
		});

		it('should return version if specified', async () => {
			const result = await getVersionToInstall(NETWORK.MAINNET, version);
			return expect(result).to.equal(version);
		});

		it('should return latest version if version is not specified', async () => {
			const result = await getVersionToInstall(NETWORK.MAINNET);
			return expect(result).to.equal(version);
		});
	});

	describe('#backupLisk', () => {
		let execStub: any = null;
		beforeEach(() => {
			sandbox.stub(fsExtra, 'emptyDirSync').returns();
			execStub = sandbox.stub(workerProcess, 'exec');
		});

		it('should backup the lisk installation', () => {
			execStub.resolves({ stdout: '', stderr: null });
			return expect(backupLisk(defaultLiskInstancePath)).not.to.throw;
		});

		it('should throw error of failed to backup', () => {
			execStub.resolves({ stdout: null, stderr: 'failed to move' });
			return expect(backupLisk(defaultLiskInstancePath)).rejectedWith(
				'failed to move',
			);
		});
	});

	describe('#upgradeLisk', () => {
		let execStub: any = null;
		beforeEach(() => {
			sandbox.stub(fsExtra, 'mkdirSync').returns();
			sandbox.stub(fsExtra, 'emptyDirSync').returns();
			sandbox.stub(fsExtra, 'copySync').returns();
			execStub = sandbox.stub(workerProcess, 'exec');
		});

		it('should throw error if failed to upgrade', () => {
			execStub.resolves({ stdout: '', stderr: 'failed to copy' });

			return expect(
				upgradeLisk(defaultLiskInstancePath, 'test', NETWORK.MAINNET, '1.0.0'),
			).to.rejectedWith('failed to copy');
		});

		it('should throw error of failed to backup', () => {
			execStub.resolves({ stdout: '', stderr: null });
			return expect(
				upgradeLisk(defaultLiskInstancePath, 'test', NETWORK.MAINNET, '1.0.0'),
			).not.to.throw;
		});
	});

	describe('#validateVersion', () => {
		let releaseStub: any = null;
		beforeEach(() => {
			releaseStub = sandbox.stub(release, 'getLatestVersion');
		});

		it('should throw if version is invalid', () => {
			const invalidVersion = 'rc.1.0.0';
			return expect(
				validateVersion(NETWORK.MAINNET, invalidVersion),
			).to.rejectedWith(
				`Upgrade version: ${invalidVersion} has invalid format, Please refer version from release url: https://downloads.lisk.io/lisk/mainnet`,
			);
		});

		it('should throw if the requested version does not exists', () => {
			releaseStub.rejects(new Error('Request failed with status code 404'));
			const invalidVersion = '9.9.9';
			return expect(
				validateVersion(NETWORK.MAINNET, invalidVersion),
			).to.rejectedWith(
				`Upgrade version: ${invalidVersion} doesn't exists in https://downloads.lisk.io/lisk/mainnet`,
			);
		});

		it('should throw if failed to get version', () => {
			releaseStub.rejects(new Error('failed to get version'));
			const invalidVersion = '9.9.9';
			return expect(
				validateVersion(NETWORK.MAINNET, invalidVersion),
			).to.rejectedWith('failed to get version');
		});

		it('should successed for valid version', () => {
			releaseStub.resolves('1.0.0');
			return expect(validateVersion(NETWORK.MAINNET, '1.0.0')).not.to.throw;
		});
	});

	describe('#getSemver', () => {
		it('should extract version from url', () => {
			const url =
				'https://downloads.lisk.io/lisk/testnet/1.6.0-rc.4/lisk-1.6.0-rc.4-Darwin-x86_64.tar.gz';
			return expect(getSemver(url)).to.equal('1.6.0-rc.4');
		});
	});
});
