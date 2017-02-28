'use strict'; /*jslint mocha:true, expr:true */

var chai = require('chai');
var express = require('express');
var _  = require('lodash');
var node = require('../../node.js');
var Rounds = require('../../../modules/rounds.js');

describe('rounds', function () {

	var rounds;

	before(function (done) {
		new Rounds(function (err, __rounds) {
			rounds = __rounds;
			done();
		}, {});
	});

	describe('calc', function () {

		it('should calculate round number for given block height', function () {
			node.expect(rounds.calc(100)).equal(1);
			node.expect(rounds.calc(200)).equal(2);
			node.expect(rounds.calc(303)).equal(3);
			node.expect(rounds.calc(304)).equal(4);
		});

		it('should deal with great numbers', function () {
			var res = rounds.calc(Number.MAX_VALUE);
			node.expect(_.isNumber(res)).to.be.ok;
			node.expect(res).to.be.below(Number.MAX_VALUE);
		});
	});
});
