'use strict';

describe('transport', function () {
	
	describe('Transport constructor', function () {
		
		describe('library', function () {
			
			it('should assign logger');
			
			it('should assign db');
			
			it('should assign bus');
			
			it('should assign schema');
			
			it('should assign network');
			
			it('should assign balancesSequence');
			
			describe('should assign logic', function () {
				
				it('should assign block');
				
				it('should assign transaction');
				
				it('should assign peers');
			});
			
			describe('should assign config', function () {
				
				describe('should assign peers', function () {
					
					describe('should assign options', function () {
						
						it('should assing timeout');
					});
				});
			});
		});
		
		it('should set self to this');
		
		it('should set __private.broadcaster to a new instance of Broadcaster');
		
		it('should call callback with error = null');
		
		it('should call callback with result = self');
	});
	
	describe('__private', function () {
		
		describe('hashsum', function () {
			
			it('should return sha256 hash of given object');
		});
		
		describe('removePeer', function () {
			
			describe('when options.peer is undefined', function () {
				
				it('should call library.logger.debug with "Cannot remove empty peer"');
				
				it('should return false');
			});
			
			describe('when options.peer is defined', function () {
			
				it('should call library.logger.debug');

				it('should call modules.peers.remove');
				
				it('should call modules.peers.remove with options.peer');
			});
		});
		
		describe('receiveSignatures', function () {
			
			it('should call library.schema.validate');
					
			it('should call library.schema.validate with query');

			it('should call library.schema.validate with schema.signatures');

			describe('when library.schema.validate fails', function () {
				
				it('should call series callback with "Invalid signatures body"');
			});
			
			describe('when library.schema.validate succeeds', function () {

				it('should call async.eachSeries');
				
				it('should call async.eachSeries with signatures');
				
				describe('for every signature in signatures', function () {
					
					it('should call __private.receiveSignature');
					
					it('should call __private.receiveSignature with signature');
					
					describe('when __private.receiveSignature fails', function () {
						
						it('should call library.logger.debug with err');
								
						it('should call library.logger.debug with signature');
						
						it('should call callback with error');
					});
					
					describe('when __private.receiveSignature succeeds', function () {
						
						it('should call callback with error = undefined');
						
						it('should call callback with result = undefined');
					});
				});
			});
		});
		
		describe('receiveSignature', function () {
			
			it('should call library.schema.validate');
			
			it('should call library.schema.validate with {signature: query}');
			
			it('should call library.schema.validate with schema.signature');
			
			describe('when library.schema.validate fails', function () {
				
				it('should call callback with "Invalid signature body"');
			});
			
			describe('when library.schema.validate succeeds', function () {
				
				it('should call modules.multisignatures.processSignature');
				
				it('should call modules.multisignatures.processSignature with query');
				
				describe('when modules.multisignatures.processSignature fails', function (){
					
					it('should call callback with "Error processing signature:" + err');
				});
				
				describe('when modules.multisignatures.processSignature succeeds', function (){
					
					it('should call callback with error = undefined');
					
					it('should call callback with result = undefined');
				});
			});
		});
		
		describe('receiveTransactions', function () {
			
			it('should call library.schema.validate');
			
			it('should call library.schema.validate with query');
			
			it('should call library.schema.validate with schema.transactions');
			
			describe('when library.schema.validate fails', function (){
				
				it('should call callback with error = "Invalid transactions body"');
			});
			
			describe('when library.schema.validate succeeds', function (){
				
				describe('for every transaction in transactions', function () {
					
					describe('when transaction is undefined', function () {
						
						it('should call callback with error = "Unable to process signature. Signature is undefined."');
					});
					
					describe('when transaction is defined', function () {
						
						it('should set transaction.bundle = true');
						
						it('should call __private.receiveTransaction');
						
						it('should call __private.receiveTransaction with transaction');
						
						it('should call __private.receiveTransaction with peer');
						
						it('should call __private.receiveTransaction with extraLogMessage');
						
						describe('when call __private.receiveTransaction fails', function () {
							
							it('should call library.logger.debug with error');
							
							it('should call library.logger.debug with transaction');
							
							it('should call callback with error');
						});
						
						describe('when call __private.receiveTransaction succeeds', function () {
							
							it('should call callback with error = undefined');
							
							it('should call callback with result = undefined');
						});
					});
				});
			});
		});
	});
});