const Vorpal = require('vorpal');
const encrypt = require('../../src/commands/encrypt');
const cryptoModule = require('../../src/utils/cryptoModule');
const tablify = require('../../src/utils/tablify');

describe('lisky encrypt command palette', () => {
	let vorpal;
	let capturedOutput = '';

	beforeEach(() => {
		vorpal = new Vorpal();
		vorpal.use(encrypt);
		vorpal.pipe((output) => {
			capturedOutput += output;
			return '';
		});
		vorpal.delimiter('lisky>');
	});

	afterEach(() => {
		capturedOutput = '';
		vorpal.ui.removeAllListeners();
	});

	describe('setup', () => {
		// eslint-disable-next-line no-underscore-dangle
		const commandFilter = command => command._name === 'encrypt';

		it('should be available', () => {
			const encryptCommands = vorpal.commands.filter(commandFilter);
			(encryptCommands).should.have.length(1);
		});

		it('should require 3 inputs', () => {
			const argsFilter = arg => arg.required;
			const encryptCommand = vorpal.commands.filter(commandFilter)[0];
			// eslint-disable-next-line no-underscore-dangle
			const requiredArgs = encryptCommand._args.filter(argsFilter);
			(requiredArgs).should.have.length(3);
		});
	});

	describe('when executed', () => {
		const message = 'Hello Lisker';
		const secret = 'pass phrase';
		const recipient = 'bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0';
		const command = `encrypt "${message}" "${secret}" "${recipient}"`;

		const nonce = '60ee6cbb5f9f0ee3736a6ffd20317f59ebfee2083e819909';
		const encryptedMessage = '4ba04a1c568b66fe5f6e670295cd9945730013f4e3feb5ac0b4e3c';
		const cryptoEncryptReturnObject = {
			nonce,
			encryptedMessage,
		};
		const tableOutput = tablify(cryptoEncryptReturnObject).toString();
		const jsonOutput = JSON.stringify(cryptoEncryptReturnObject);

		beforeEach(() => {
			sinon
				.stub(cryptoModule, 'encrypt')
				.returns(cryptoEncryptReturnObject);
		});

		afterEach(() => {
			cryptoModule.encrypt.restore();
		});

		it('should handle valid parameters', () => {
			vorpal.execSync(command);
			(cryptoModule.encrypt.calledWithExactly(message, secret, recipient))
				.should.be.true();
		});

		it('should print the returned object', () => vorpal.exec(command)
			.then(() => (capturedOutput).should.equal(tableOutput)));

		it('should print json with --json option', () => {
			const jsonCommand = `${command} --json`;
			return vorpal.exec(jsonCommand)
				.then(() => (capturedOutput).should.equal(jsonOutput));
		});

		it('should handle a -j shorthand for --json option', () => {
			const jCommand = `${command} -j`;
			return vorpal.exec(jCommand)
				.then(() => (capturedOutput).should.equal(jsonOutput));
		});

		it('should print a table with --no-json option', () => {
			const noJsonCommand = `${command} --no-json`;
			return vorpal.exec(noJsonCommand)
				.then(() => (capturedOutput).should.equal(tableOutput));
		});
	});
});
