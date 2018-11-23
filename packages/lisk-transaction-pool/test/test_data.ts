const transferTransactions = [{
    amount: '3289',
    recipientId: '4726241959522258885L',
    senderPublicKey: '6fcd34f3cb5bec839b9d850882a1d66a71f662df7e8616c2e50e2e946d7a0bfd',
    timestamp: 78881792,
    type: 0,
    fee: '10000000',
    asset: {},
    signature: '6f0d63ae1de68627a2982a0aa644600ccada9ae8f859200ff692336cf5410c35929dfcf8ce6c8aff14b00184f0c0c2ec2880a0e7f60895ef312915312a30b70b',
    id: '2775327732671672602'
}, {
    amount: '76794',
    recipientId: '2183856197742428571L',
    senderPublicKey: '00dab5aa707a5f9215b0c0b966547fe27594153950322ce5fa48f8d165ccd2cf',
    timestamp: 78881792,
    type: 0,
    fee: '10000000',
    asset: {},
    signature: '00c5f31426fd3fcfb43a8cc8777fb91277035ec32f4c89d86b0de6ee93eca23d7c98136c4ff308c72709661e1afdc527c105cf223892a93bd3f01ca0b263840d',
    id: '8303440489551858552'
}, {
    amount: '1615',
    recipientId: '3618136153239730510L',
    senderPublicKey: '2e646c903d657b3d90c9d1d4a4e6d733c5b511cc5329c0e03f40311ab20eeedc',
    timestamp: 78881792,
    type: 0,
    fee: '10000000',
    asset: {},
    signature: '906f71bb6f72c483ac8a4bd81517a14aaa80e0ace4590a9c358065061855f19b9804bf519e6d0b4da272157b31c6d2d0e18ef4aa2534976b90373c22f335c90f',
    id: '6470413743968698383'
}, {
    amount: '3323',
    recipientId: '2668039105343182560L',
    senderPublicKey: 'c3a97d188a2ab317f87963caf77db29779b8c0cda7cf4e4086c8f883a1351313',
    timestamp: 78881792,
    type: 0,
    fee: '10000000',
    asset: {},
    signature: '21c2373ca807be80ebd4641bb13289062a8a3bb42edfded2d3f7ff674f16d96732b51f0b01ea6755b42926f8786f3ca9cc3d06fc991b68ffa42664b35ede320f',
    id: '16209260135223691293'
}, {
    amount: '15568',
    recipientId: '3172797908379258401L',
    senderPublicKey: 'bab42db66705c34a83ff855e7b8a90605e0bbf1470228cc093fa23461b8758e5',
    timestamp: 78881792,
    type: 0,
    fee: '10000000',
    asset: {},
    signature: 'faaf3fcfe58e6435b47716fa89b322d855e062ffa52d6e01fe569628c48a2310d6390736d2ff47efd2543c26df309c16f8e789a406da03b1e4dd2511176bb408',
    id: '927268910456751599'
}];

const transferTransactionInstances = transferTransactions.map(transferTransaction => {
    return {
        ...transferTransaction,
        containsUnqiueData: () => false,
        verifyTransactionAgainstOtherTransactions: () => true
    };
})

export { transferTransactionInstances };