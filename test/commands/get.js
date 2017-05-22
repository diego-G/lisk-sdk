const Vorpal = require('vorpal');
const lisky = require('../../index');
const get = require('../../commands/get');
var BigNumber = require('big-number');

const vorpal = Vorpal();

vorpal.use(get);

vorpal
	.delimiter('>')
	.show();

vorpal
	.command('set <type> <input>')
	.action(function (args, cb) {
		console.log(args);
		return args;
	});



function executeCommand (command, callback) {

	vorpal.exec(command, function(err, data){
		if (!err) {
			return callback(this);
		} else {
			return err;
		}
	});

}

describe('lisky get command palette', () => {

	it('should test command get account', (done) => {

		let command = 'get account 1813095620424213569L';

		executeCommand(command, function (result) {
			(result._command.command).should.be.equal(command);
			done();
		});

	});

	it('should have the right parameters with account', (done) => {

		let command = 'get account 1813095620424213569L';

		executeCommand(command, function (result) {
			(result._command.args.type).should.be.equal('account');
			(result._command.args.input).should.be.equal('1813095620424213569L');
			done();
		});

	});

	it('should have the right parameters with block', (done) => {

			let command = 'get block 261210776798678785';

		executeCommand(command, function (result) {
			(result._command.args.type).should.be.equal('block');
			(result._command.args.input).should.be.equal(261210776798678785);
			done();
		});

	});

	it('should have the right parameters with delegate', (done) => {

		let command = 'get delegate tosch';

		executeCommand(command, function (result) {
			(result._command.args.type).should.be.equal('delegate');
			(result._command.args.input).should.be.equal('tosch');
			done();
		});

	});

	it('should have the right parameters with delegate', (done) => {

		let command = 'get transaction 3641049113933914102';

		executeCommand(command, function (result) {
			(result._command.args.type).should.be.equal('transaction');
			(result._command.args.input).should.be.equal(3641049113933914102);
			done();
		});

	});

});

describe('lisky get execution', () => {

	it('should get account information', (done) => {
		vorpal.execSync('get block 261210776798678785', function(res) {
			this.log(res);
			done();
		});
	});

});

describe('number problem with vorpal', (done) => {
	var fixture = BigNumber(261210776798678785);
	vorpal.execSync('get block 261210776798678785', function(res) {
		console.log(res);
		(res.input).should.be.equal(fixture);
		done();
	});
});