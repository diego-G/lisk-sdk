def initBuild() {
	try {
		sh '''
		pkill -f app.js -9 || true
		sudo service postgresql restart
		dropdb lisk_test || true
		createdb lisk_test
		'''
		deleteDir()
		checkout scm
	} catch (err) {
		echo "Error: ${err}"
		currentBuild.result = 'FAILURE'
		report()
		error('Stopping build: initializing build failed')
	}
}

def buildDependency() {
	try {
		sh '''
		rsync -axl -e "ssh -oUser=jenkins" master-01:/var/lib/jenkins/lisk/node_modules/ "$WORKSPACE/node_modules/"
		npm install
		'''
	} catch (err) {
		echo "Error: ${err}"
		currentBuild.result = 'FAILURE'
		report()
		error('Stopping build: building dependencies failed')
	}
}

def startLisk() {
	try {
		sh '''
		cp test/config.json test/genesisBlock.json .
		NODE_ENV=test JENKINS_NODE_COOKIE=dontKillMe ~/start_lisk.sh
		'''
	} catch (err) {
		echo "Error: ${err}"
		currentBuild.result = 'FAILURE'
		report()
		error('Stopping build: Lisk failed to start')
	}
}

def cleanup() {
	try {
		sh 'pkill -f app.js -9'
	} catch (err) {
		echo "Error: ${err}"
		currentBuild.result = 'FAILURE'
		report()
		error('Stopping build: cleanup failed')
	}
}

def cleanup_master() {
	try{
		dir('/var/lib/jenkins/coverage/') {
			sh '''
			rm -rf node-0*
			rm -rf *.zip
			rm -rf coverage-unit/*
			rm -f merged-lcov.info
			rm -rf lisk/*
			rm -f coverage.json
			rm -f lcov.info
			'''
		}
	} catch (err) {
		echo "Error: ${err}"
		currentBuild.result = 'FAILURE'
		report()
		error('Stopping build: master cleanup failed')
	}
}

def run_test(test_path) {
	try {
		sh """
		export TEST=${test_path} TEST_TYPE='FUNC' NODE_ENV='TEST'
		cd "\$(echo ${env.WORKSPACE} | cut -f 1 -d '@')"
		npm run ${params.JENKINS_PROFILE}
		"""
	} catch (err) {
		echo "Error: ${err}"
		currentBuild.result = 'FAILURE'
		report()
		error('Stopping build: master cleanup failed')
	}
}

def report_coverage(node) {
	try {
		sh """
		HOST=127.0.0.1:4000 npm run fetchCoverage
		scp test/.coverage-func.zip jenkins@master-01:/var/lib/jenkins/coverage/coverage-func-node-${node}.zip
		"""
	} catch (err) {
		echo "Error: ${err}"
		currentBuild.result = 'FAILURE'
		report()
		error('Stopping build: reporting coverage statistics failed')
	}
}

def report(){
	step([
		$class: 'GitHubCommitStatusSetter',
		errorHandlers: [[$class: 'ShallowAnyErrorHandler']],
		contextSource: [$class: 'ManuallyEnteredCommitContextSource', context: 'jenkins-ci/func-unit'],
		statusResultSource: [
			$class: 'ConditionalStatusResultSource',
			results: [
					[$class: 'BetterThanOrEqualBuildResult', result: 'SUCCESS', state: 'SUCCESS', message: 'This commit looks good :)'],
					[$class: 'BetterThanOrEqualBuildResult', result: 'FAILURE', state: 'FAILURE', message: 'This commit failed testing :('],
					[$class: 'AnyBuildResult', state: 'FAILURE', message: 'This build some how escaped evaluation']
			]
		]
	])
	if ( currentBuild.result == 'FAILURE' ) {
		def pr_branch = ''
		if (env.CHANGE_BRANCH != null) {
			pr_branch = " (${env.CHANGE_BRANCH})"
		}
		slackSend color: 'danger', message: "Build #${env.BUILD_NUMBER} of <${env.BUILD_URL}|${env.JOB_NAME}>${pr_branch} failed (<${env.BUILD_URL}/console|console>, <${env.BUILD_URL}/changes|changes>)", channel: '#lisk-core-jenkins'
	}
}

lock(resource: "Lisk-Core-Nodes", inversePrecedence: true) {

	properties([
	  parameters([
	    string(name: 'JENKINS_PROFILE', defaultValue: 'jenkins', description: 'To build cache dependencies and run slow test, change this value to jenkins-extensive.', )
	   ])
	])

	stage ('Prepare Workspace') {
		parallel(
			"Build cached dependencies" : {
				node('master-01'){
					try {
						sh """
						if [ ${params.JENKINS_PROFILE} = "jenkins-extensive" ]; then
							rm -Rf "${env.WORKSPACE}/node_modules/"
							npm install
							rsync -axl --delete "${env.WORKSPACE}/node_modules/" /var/lib/jenkins/lisk/node_modules/
						fi
						"""
					} catch (err) {
						echo "Error: ${err}"
						currentBuild.result = 'FAILURE'
						report()
						error('Stopping build: caching dependencies failed')
					}
				}
			},
			"Build Node-01" : {
				node('node-01'){
					initBuild()
				}
			},
			"Build Node-02" : {
				node('node-02'){
					initBuild()
				}
			},
			"Build Node-03" : {
				node('node-03'){
					initBuild()
				}
			},
			"Build Node-04" : {
				node('node-04'){
					initBuild()
				}
			},
			"Initialize Master Workspace" : {
				node('master-01'){
					cleanup_master()
				}
			}
		)
	}

	stage ('Build Dependencies') {
		parallel(
			"Build Dependencies Node-01" : {
				node('node-01'){
					buildDependency()
				}
			},
			"Build Dependencies Node-02" : {
				node('node-02'){
					buildDependency()
				}
			},
			"Build Dependencies Node-03" : {
				node('node-03'){
					buildDependency()
				}
			},
			"Build Dependencies Node-04" : {
				node('node-04'){
					buildDependency()
				}
			}
		)
	}

	stage ('Start Lisk') {
		parallel(
			"Start Lisk Node-01" : {
				node('node-01'){
					startLisk()
				}
			},
			"Start Lisk Node-02" : {
				node('node-02'){
					startLisk()
				}
			},
			"Start Lisk Node-03" : {
				node('node-03'){
					startLisk()
				}
			},
			"Start Lisk Node-04" : {
				node('node-04'){
					startLisk()
				}
			}
		)
	}

	stage ('Parallel Tests') {
		parallel(
			"ESLint" : {
				node('node-01'){
					sh '''
					cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
					npm run eslint
					'''
				}
			},
			"Functional Accounts" : {
				node('node-01'){
					run_test('test/functional/http/get/accounts.js')
				}
			},
			"Functional Blocks" : {
				node('node-01'){
					run_test('test/functional/http/get/blocks.js')
				}
			},
			"Functional Dapps" : {
				node('node-01'){
					run_test('test/functional/http/get/dapps.js')
				}
			},
			"Functional Delegates" : {
				node('node-01'){
					run_test('test/functional/http/get/delegates.js')
				}
			},
			"Functional Loader" : {
				node('node-01'){
					run_test('test/functional/http/get/loader.js')
				}
			},
			"Functional Multisignatures" : {
				node('node-01'){
					run_test('test/functional/http/get/multisignatures.js')
				}
			},
			"Functional Multisignatures post" : {
				node('node-01'){
					run_test('test/functional/http/get/multisignatures.js')
				}
			},
			"Functional Transactions" : {
				node('node-01'){
					run_test('test/functional/http/get/transactions.js')
				}
			},
			"Functional POST tx type 0" : {
				node('node-01'){
					run_test('test/functional/http/post/0.transfer.js')
				}
			},
			"Functional Peers" : {
				node('node-02'){
					run_test('test/functional/http/get/peers.js')
				}
			},  // End node-01 functional tests
			"Functional Transport - Main" : {
				node('node-02'){
					run_test('test/functional/ws/transport.js')
				}
			},
			"Functional Transport - Blocks" : {
				node('node-02'){
					run_test('test/functional/ws/transport.blocks.js')
				}
			},
			"Functional Transport - Client" : {
				node('node-02'){
					run_test('test/functional/ws/transport.client.js')
				}
			},
			"Functional Transport - Handshake" : {
				node('node-02'){
					run_test('test/functional/ws/transport.handshake.js')
				}
			},
			"Functional Transport - Transactions" : {
				node('node-02'){
					run_test('test/functional/ws/transport.transactions.js')
				}
			}, // End Node-02 Tests
			"Unit Tests" : {
				node('node-03'){
					sh '''
					export TEST_TYPE='UNIT' NODE_ENV='TEST'
					cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
					npm run test-unit
					'''
				}
			},
			"Unit Tests - sql blockRewards" : {
				node('node-03'){
					run_test('test/unit/sql/blockRewards.js')
				}
			},
			"Unit Tests - logic blockReward" : {
				node('node-03'){
					run_test('test/unit/logic/blockReward.js ')
				}
			},// End Node-03 unit tests
			"Functional Stress - Transactions" : {
				node('node-04'){
					run_test('test/functional/ws/transport.transactions.stress.js')
				}
			} // End Node-04
		) // End Parallel
	}

	stage ('Gather Coverage') {
		parallel(
			"Gather Coverage Node-01" : {
				node('node-01'){
					report_coverage('01')
				}
			},
			"Gather Coverage Node-02" : {
				node('node-02'){
					report_coverage('02')
				}
			},
			"Gather Coverage Node-03" : {
				node('node-03'){
					try {
						sh '''
						export HOST=127.0.0.1:4000
						# Gathers unit test into single lcov.info
						npm run coverageReport
						npm run fetchCoverage
						# Submit coverage reports to Master
						scp -r test/.coverage-unit/* jenkins@master-01:/var/lib/jenkins/coverage/coverage-unit/
						scp test/.coverage-func.zip jenkins@master-01:/var/lib/jenkins/coverage/coverage-func-node-03.zip
						'''
					} catch (err) {
						echo "Error: ${err}"
						currentBuild.result = 'FAILURE'
						report()
						error('Stopping build: submitting coverage failed')
					}
				}
			},
			"Gather Coverage Node-04" : {
				node('node-04'){
					report_coverage('04')
				}
			}
		)
	}

	stage ('Submit Coverage') {
		node('master-01'){
			try {
				sh '''
				cd /var/lib/jenkins/coverage/
				unzip coverage-func-node-01.zip -d node-01
				unzip coverage-func-node-02.zip -d node-02
				unzip coverage-func-node-03.zip -d node-03
				unzip coverage-func-node-04.zip -d node-04
				bash merge_lcov.sh . merged-lcov.info
				cp merged-lcov.info $WORKSPACE/merged-lcov.info
				cp .coveralls.yml $WORKSPACE/.coveralls.yml
				cd $WORKSPACE
				cat merged-lcov.info | coveralls -v
				'''
			} catch (err) {
				echo "Error: ${err}"
				currentBuild.result = 'FAILURE'
				report()
				error('Stopping build: submitting coverage failed')
			}
		}
	}

	stage ('Cleanup') {
		parallel(
			"Cleanup Node-01" : {
				node('node-01'){
					cleanup()
				}
			},
			"Cleanup Node-02" : {
				node('node-02'){
					cleanup()
				}
			},
			"Cleanup Node-03" : {
				node('node-03'){
					cleanup()
				}
			},
			"Cleanup Node-04" : {
				node('node-04'){
					cleanup()
				}
			},
			"Cleanup Master" : {
				node('master-01'){
					cleanup_master()
				}
			}
		)
	}

	stage ('Set milestone') {
		node('master-01'){
			milestone 1
			currentBuild.result = 'SUCCESS'
			report()
		}
	}
}
