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

var randomstring = require('randomstring');

var Z_schema = require('../../../helpers/z_schema.js');
var constants = require('../../../helpers/constants.js');

var validator = new Z_schema();

var shouldReturnFalseForEmptyNonStringValues = function () {
	var composedSchema = {
		type: 'object',
		properties: {
			test: {}
		}
	};

	it('should return false for null values', function () {
		composedSchema.properties.test = this.schema;
		expect(validator.validate({ test: null }, composedSchema)).to.equal(false);
	});

	it('should return false for undefined values', function () {
		composedSchema.properties.test = this.schema;
		expect(validator.validate({ test: undefined }, composedSchema)).to.equal(false);
	});

	it('should return false for NaN values', function () {
		composedSchema.properties.test = this.schema;
		expect(validator.validate({ test: NaN }, composedSchema)).to.equal(false);
	});

	it('should return false for empty array values', function () {
		expect(validator.validate([], this.schema)).to.equal(false);
	});

	it('should return false for empty object values', function () {
		expect(validator.validate({}, this.schema)).to.equal(false);
	});
};

var shouldReturnTrueForEmptyStringValues = function () {
	it('should return true for empty string values', function () {
		expect(validator.validate('', this.schema)).to.equal(true);
	});
};

describe('schema - custom formats', function () {
	describe('id', function () {
		beforeEach(function () {
			this.schema = {
				format: 'id'
			};
		});

		it('should return false if contains non-numeric value', function () {
			var invalidData = ['L1234', '1234L', 'ABCD', '12L34'];

			invalidData.forEach(function (item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return false for negative value', function () {
			expect(validator.validate('-100', this.schema)).to.equal(false);
		});

		it('should return true if string contains numeric value', function () {
			var validData = ['123', '0', '663332353555532'];

			validData.forEach(function (item) {
				expect(validator.validate(item, this.schema)).to.equal(true);
			}, this);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('additionalData', function () {
		beforeEach(function () {
			this.schema = {
				format: 'additionalData'
			};
		});

		it('should return false if string is longer than maxLength (either chars or bytes)', function () {
			var invalidData = [];
			invalidData.push(`${randomstring.generate(constants.additionalData.maxLength - 1)}现`);
			invalidData.push(randomstring.generate(constants.additionalData.maxLength + 1));

			invalidData.forEach(function (item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return true if string is between minLength and maxLength', function () {
			var validData = [];
			validData.push(randomstring.generate(constants.additionalData.minLength));
			validData.push(randomstring.generate(constants.additionalData.maxLength));

			validData.forEach(function (item) {
				expect(validator.validate(item, this.schema)).to.equal(true);
			}, this);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('address', function () {
		beforeEach(function () {
			this.schema = {
				format: 'address'
			};
		});

		it('should return false if value does not end with L', function () {
			var invalidData = ['L1234', '1234L1', 'LABCD', '12L34'];

			invalidData.forEach(function (item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return false for non-numeric addresses', function () {
			var invalidData = ['123aL', 'aaaaL', 'a123L', '___L', 'L'];

			invalidData.forEach(function (item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return true if string contains numeric value', function () {
			var validData = ['123L', '0L', '663332353555532L'];

			validData.forEach(function (item) {
				expect(validator.validate(item, this.schema)).to.equal(true);
			}, this);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('username', function () {
		beforeEach(function () {
			this.schema = {
				format: 'username'
			};
		});

		it('should return false for invalid username value', function () {
			var invalidUsername = 'hello^lisk';
			expect(validator.validate(invalidUsername, this.schema)).to.equal(false);
		});

		it('should return true for valid username value', function () {
			var validUsername = 'hello111_lisk!';
			expect(validator.validate(validUsername, this.schema)).to.equal(true);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('hex', function () {
		beforeEach(function () {
			this.schema = {
				format: 'hex'
			};
		});

		it('should return false for invalid hex value', function () {
			var invalidHex = 'ec0c50z';
			expect(validator.validate(invalidHex, this.schema)).to.equal(false);
		});

		it('should return true for valid hex value', function () {
			var validHex = 'ec0c50e';
			expect(validator.validate(validHex, this.schema)).to.equal(true);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('publicKey', function () {
		beforeEach(function () {
			this.schema = {
				format: 'publicKey'
			};
		});

		it('should return false if value is not in hex format', function () {
			var invalidPublicKey = 'zxcdec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8';
			expect(validator.validate(invalidPublicKey, this.schema)).to.equal(false);
		});

		it('should return false for value < 64', function () {
			var invalidLengthPublicKey = 'c3595ff6041c3bd28b76b8cf75dce8225173d1241624ee89b50f2a8';
			expect(validator.validate(invalidLengthPublicKey, this.schema)).to.equal(false);
		});

		it('should return false for value > 64', function () {
			var invalidLengthPublicKey = 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8123';
			expect(validator.validate(invalidLengthPublicKey, this.schema)).to.equal(false);
		});

		it('should return true for valid publicKey', function () {
			var validPublicKey = 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8';
			expect(validator.validate(validPublicKey, this.schema)).to.equal(true);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('csv', function () {
		beforeEach(function () {
			this.schema = {
				format: 'csv'
			};
		});

		it('should return false for invalid csv value', function () {
			var invalidCsv = ['foo', 'bar'];
			expect(validator.validate(invalidCsv, this.schema)).to.equal(false);
		});

		it('should return true for valid csv value', function () {
			var validCsv = '1,2,3,4,5';
			expect(validator.validate(validCsv, this.schema)).to.equal(true);
		});

		it('should return false for too many csv values', function () {
			var invalidCsv = `1${Array(1100).join(',1')}`;
			expect(validator.validate(invalidCsv, this.schema)).to.equal(false);
		});

		shouldReturnFalseForEmptyNonStringValues();
	});

	describe('signature', function () {
		beforeEach(function () {
			this.schema = {
				format: 'signature'
			};
		});

		it('should return false if value is not in hex format', function () {
			var invalidPublicKey = 'zxcdec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8';
			expect(validator.validate(invalidPublicKey, this.schema)).to.equal(false);
		});

		it('should return false if value < 128', function () {
			var invalidLengthSignature = '3d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05';
			expect(validator.validate(invalidLengthSignature, this.schema)).to.equal(false);
		});

		it('should return false if value > 128', function () {
			var invalidLengthSignature = '1231d8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05';
			expect(validator.validate(invalidLengthSignature, this.schema)).to.equal(false);
		});

		it('should return true for valid publicKey', function () {
			var validSignature = 'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05';
			expect(validator.validate(validSignature, this.schema)).to.equal(true);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('queryList', function () {
		beforeEach(function () {
			this.schema = {
				format: 'queryList'
			};
		});

		it('should return false for non-object values', function () {
			var invalidData = ['xxx', 123, NaN, undefined, [1, 2], '', null];

			invalidData.forEach(function (item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return true for object values', function () {
			var validQueryList = { foo: 'bar' };
			expect(validator.validate(validQueryList, this.schema)).to.equal(true);
		});
	});

	describe('delegatesList', function () {
		beforeEach(function () {
			this.schema = {
				format: 'delegatesList'
			};
		});

		it('should return false for non-object values', function () {
			var invalidData = ['xxx', 123, NaN, undefined, [1, 2], '', null];

			invalidData.forEach(function (item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return true for object values', function () {
			var validDelegateList = { foo: 'bar' };
			expect(validator.validate(validDelegateList, this.schema)).to.equal(true);
		});
	});

	describe('parsedInt', function () {
		beforeEach(function () {
			this.schema = {
				format: 'parsedInt'
			};
		});

		it('should return false for non-numeric values', function () {
			var invalidData = ['xxx', {}, NaN, undefined, [1, 2], null, 1.123];

			invalidData.forEach(function (item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return true for numeric values', function () {
			var validData = [123, '123', 0, '0'];

			validData.forEach(function (item) {
				expect(validator.validate(item, this.schema)).to.equal(true);
			}, this);
		});

		shouldReturnFalseForEmptyNonStringValues();
	});

	describe('os', function () {
		beforeEach(function () {
			this.schema = {
				format: 'os'
			};
		});

		it('should return false for invalid os value', function () {
			var invalidOs = 'atari!!!!';
			expect(validator.validate(invalidOs, this.schema)).to.equal(false);
		});

		it('should return true for valid os value', function () {
			var validOs = 'linux_1';
			expect(validator.validate(validOs, this.schema)).to.equal(true);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('version', function () {
		beforeEach(function () {
			this.schema = {
				format: 'version'
			};
		});

		it('should return false for invalid version value', function () {
			var invalidData = ['1a.1', '1111.11.11', '1.1.1.1.1', '1.1.1aa'];

			invalidData.forEach(function (item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return true for valid version value', function () {
			var validData = ['1.1.1', '111.1.1', '11.11.22c'];

			validData.forEach(function (item) {
				expect(validator.validate(item, this.schema)).to.equal(true);
			}, this);
		});

		shouldReturnFalseForEmptyNonStringValues();
		shouldReturnTrueForEmptyStringValues();
	});

	describe('ipOrFQDN', function () {
		beforeEach(function () {
			this.schema = {
				format: 'ipOrFQDN'
			};
		});

		it('should return false if value is not an IP or not a FQDN', function () {
			var invalidData = ['192.168', 'alpha-', 'apha_server', 'alpha.server.'];

			invalidData.forEach(function (item) {
				expect(validator.validate(item, this.schema)).to.equal(false);
			}, this);
		});

		it('should return true if value is an IP or a valid FQDN', function () {
			var validData = ['192.168.0.1', '127.0.0.1', 'localhost', 'app.server', 'alpha.server.com', '8.8.8.8'];

			validData.forEach(function (item) {
				expect(validator.validate(item, this.schema)).to.equal(true);
			}, this);
		});

		shouldReturnFalseForEmptyNonStringValues();
	});
});
