/* eslint-disable import/no-extraneous-dependencies */
const loadGruntTasks = require('load-grunt-tasks');

module.exports = function configureGrunt(grunt) {
	loadGruntTasks(grunt);

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		exec: {
			coverageSingle: './node_modules/.bin/nyc --report-dir=test/.coverage-unit --reporter=lcov ./node_modules/.bin/_mocha ./test/**/*.js',
			prepareDistNode: 'rm -r dist-node/* || mkdir dist-node | echo',
			prepareDistBrowser: 'rm -r dist-browser/* || mkdir dist-browser | echo',
			babel: './node_modules/.bin/babel src --out-dir ./dist-node',
			babelTest: './node_modules/.bin/babel src --out-dir ./browsertest/src && ./node_modules/.bin/babel test --ignore test/transactions/dapp.js --out-dir ./browsertest/test',
			tidyTest: 'rm -r browsertest/{src,test}',
		},

		eslint: {
			target: ['.'],
		},

		browserify: {
			dist: {
				src: './dist-node/*',
				dest: './dist-browser/lisk-js.js',
			},
			test: {
				src: './browsertest/test/**/*.js',
				dest: './browsertest/browsertest.js',
			},
			options: {
				browserifyOptions: {
					standalone: 'lisk',
				},
			},
		},

		uglify: {
			dist: {
				files: {
					'dist-browser/lisk-js.min.js': ['dist-browser/lisk-js.js'],
				},
			},
			test: {
				files: {
					'browsertest/browsertest.min.js': 'browsertest/browsertest.js',
				},
			},
			options: {
				mangle: false,
			},
		},

		coveralls: {
			src: 'test/.coverage-unit/*.info',
		},
	});

	grunt.registerTask('eslint-fix', 'Run eslint and fix formatting', () => {
		grunt.config.set('eslint.options.fix', true);
		grunt.task.run('eslint');
	});

	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-coveralls');
	grunt.registerTask('jenkins', ['exec:coverageSingle', 'coveralls']);
	grunt.registerTask('eslint-ci', ['eslint']);
	grunt.registerTask('build', [
		'exec:prepareDistNode',
		'exec:prepareDistBrowser',
		'exec:babel',
		'browserify:dist',
		'uglify:dist',
	]);
	grunt.registerTask('build-browsertest', [
		'exec:babelTest',
		'browserify:test',
		'uglify:test',
		'exec:tidyTest',
	]);
	grunt.registerTask('default', [
		'eslint',
		'exec:coverageSingle',
		'build',
	]);
};
