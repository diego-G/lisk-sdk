# @liskhq/lisk-transactions

@liskhq/lisk-transactions is containing everything related to transactions according to the Lisk protocol

## Introduction

Transactions are the essential part of the blockchain applications created using Lisk SDK.

The Lisk SDK provides a class [BaseTransaction](https://github.com/LiskHQ/lisk-sdk/blob/development/elements/lisk-transactions/src/base_transaction.ts) from which developers can inherit and extend from, to create __custom transaction types__.```
The application-specific business logic for custom transaction types is defined according to an abstract [interface](#interface) that is common across all transaction types.

All of the default transaction types of the Lisk SDK transactions implement the abstract interface of the base transaction, and therefore can be used as a role model for custom transactions.
It's also possible to inherit from one of the default transaction types, in order to extent or modify them.

The default transaction types each implement a different use-case of the Lisk network, i.e:

0. Balance transfer (type 0),
1. Second signature registration (type 1)
1. Delegate registration (type 2)
1. Delegate vote (type 3)
1. Multisignature account registration (type 4)

> The first 10 transaction types are reserved for the [Lisk protocol](https://lisk.io/documentation/lisk-protocol), don't use them to register custom transactions.

For a complete list of all default transaction types, check out the section [Lisk Transactions](https://lisk.io/documentation/lisk-protocol/transactions) of the Lisk Protocol.

Check out the Lisk SDK [Example Apps](https://github.com/LiskHQ/lisk-sdk-test-app) for simple [code examples of custom transaction types](https://github.com/LiskHQ/lisk-sdk-test-app/blob/development/hello_world/hello_transaction.js).

### Lifecycle

The lifecycle of a transaction in general in Lisk SDK can be summarized as follows:

1. A transaction is created and signed (off-chain). The script to do it is in `src/create_and_sign.ts`.
2. The transaction is sent to a network. This can be done by a third party tool (like `curl` or `Postman`), but also using Lisk Commander, Lisk Hub or Mobile. All of the tools need to be authorized to access an HTTP API of a network node.
3. A network node receives a transaction and after a lightweight schema validation, adds it to a transaction pool.
4. In the transaction pool, the transactions are firstly `validated`. In this step, only static checks are performed. These include schema validation and signature validation.
5. Validated transactions go to the `prepare` step defined in the transaction class, which to limit the I/O database operations prepares all the information relevant to properly `apply` or `undo` the transaction. The store with the prepared data is a parameter of the mentioned methods.
6. Delegates are forging the valid transactions into the blocks and broadcasting the blocks to the network. Each network node performs the `apply` and `applyAsset` steps after the successful `validate` step.
7. It is probable, especially shortly after a block is applied, that due to the decentralized network conditions a node does the `undo` step and the block containing all of the included transactions get reverted in favour of a competing block.

While implementing a custom transaction, it is necessary to implement some of the mentioned steps. For most of them, a base transaction implements a default behaviour. As you feel more confident in using Lisk SDK, it is more likely for developers to override most of the base transaction methods, so the implementation is well-tailored and implemented with the best possible performance to the application's use case.

### Interface

#### Required

All of the abstract methods and properties on the base transaction's interface are required to implement. Those are:

##### TYPE

> static TYPE: number

The hallmark of a transaction. Override this static parameter with any number, keeping in mind that the first 10 types (0-9) are reserved for the default transactions.

##### applyAsset

> applyAsset(store: StateStore): ReadonlyArray<TransactionError>

The business use-case of a transaction is implemented in `applyAsset` method. Apply all of the necessary changes from the received transaction to the affected account(s) by calling `store.set`. Call `store.get` to get all of the relevant data. The transaction that you're currently processing is the function's context (like `this.amount`).
Invalidate the transaction by pushing an error into the result array.

##### undoAsset

> undoAsset(store: StateStore): ReadonlyArray<TransactionError>

The invert of `applyAsset`. Roll-back all of the changes to the accounts done in the `applyAsset` step.

##### validateAsset

> validateAsset(): ReadonlyArray<TransactionError>

Before a transaction reaches the apply step it gets validated. Check the transaction's asset correctness from the schema perspective (no access to StateStore here).
Invalidate the transaction by pushing an error into the result array.

##### prepare

> prepare(store: StateStorePrepare): Promise<void>

Prepare the relevant information about the accounts, which will be accessible in the later steps during the `apply` and `undo` steps.

#### Performance

To increase your application's performance, you should override the following functions: `verifyAgainstTransactions`, `assetFromSync`, `fromSync`.

The BaseTransaction provides the default implementation of the methods revolving around the signatures. As your application matures you can provide the custom ways of how your a transaction's signature is derived: `sign`, `getBytes`, `assetToBytes`.

## Installation

```sh
$ npm install --save @liskhq/lisk-transactions
```

## License

Copyright © 2016-2018 Lisk Foundation

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the [GNU General Public License](https://github.com/LiskHQ/lisk-elements/tree/master/LICENSE) along with this program. If not, see <http://www.gnu.org/licenses/>.

---

This program also incorporates work previously released with lisk-js `v0.5.2` (and earlier) versions under the [MIT License](https://opensource.org/licenses/MIT). To comply with the requirements of that license, the following permission notice, applicable to those parts of the code only, is included below:

Copyright © 2016-2017 Lisk Foundation

Copyright © 2015 Crypti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[lisk core github]: https://github.com/LiskHQ/lisk
[lisk documentation site]: https://lisk.io/documentation/lisk-elements
