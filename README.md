# lisky
Lisky allows you to communicate with a remote or local node and carry out Lisk-related functionality using an interactive or non-interactive command line tool.

[![Build Status](https://jenkins.lisk.io/buildStatus/icon?job=lisky/master)](https://jenkins.lisk.io/job/lisky/job/master/)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)
[![GitHub release](https://img.shields.io/badge/version-0.1.1-blue.svg)](#)

## Prerequisites

Lisky requires [Node.js](https://nodejs.org/) as the underlying engine for code execution. Node.js is supported on most operating systems. Follow the instructions for your operating system on the [Node.js downloads page](https://nodejs.org/en/download/). You will need version 6.11.x or higher. NPM is automatically installed along with Node.js.

## Installation

### From NPM
```sh
$ npm install --global --production lisky
```

Upon successful completion, NPM will add the `lisky` executable to your PATH.

### From Source
Clone the Lisky repository using Git and install the dependencies:
```sh
$ git clone https://github.com/LiskHQ/lisky.git
$ cd lisky
$ npm install
```
Before running the executable you will need to build Lisky:
```sh
npm run build
```
#### Adding the Lisky executable to your PATH

WARNING: If you have installed Lisky globally via NPM (see [Install Lisky via NPM](docs:lisky-installation-npm)), following the instructions in this section is not recommended as they will introduce conflicts.

If you would like to add the `lisky` executable to your PATH you have two options: option 1 will install the current state of the code you are installing globally, while option 2 will only link to the code and therefore automatically reflect changes you make going forward.

##### 1. Install globally

Running this command from within the repository will add Lisky to your global NPM packages, and add the `lisky` executable to your PATH. Be aware that any previous globally installed lisky version will get overridden with this local version.

```sh
$ npm install --global --production
```

Note that you will have to repeat this process for each subsequent build of Lisky.

##### 2. Create a symlink

The other option is to ask NPM to create a symlink in the global folder that links to the package.

```sh
$ npm link
```

This will also add `lisky` to your PATH, but you won't have to repeat the process if you pull or create a new build. Be aware that any previous globally installed lisky version will get overridden with this local version.


## Usage:

### Interactive use

Start lisky:

```sh
$ lisky
 _ _     _
| (_)___| | ___   _
| | / __| |/ / | | |
| | \__ \   <| |_| |
|_|_|___/_|\_\\__, |
              |___/

Running v0.1.1. Copyright (C) 2017 Lisk Foundation
Type `help` to get started.

lisky> help

  Commands:

    help [command...]                    Provides help for a given command.
    exit                                 Exits lisky.
    env                                  Print environmental configuration
    get [options] <type> <input>         Get information from <type> with parameter <input>.
                                         Types available: account, address, block, delegate, transaction
                                         E.g. get delegate lightcurve
                                         e.g. get block 5510510593472232540
    list [options] <type> <variadic...>  Get information from <type> with parameters <input, input, ...>.
                                         Types available: accounts, addresses, blocks, delegates, transactions
                                         E.g. list delegates lightcurve tosch
                                         E.g. list blocks 5510510593472232540 16450842638530591789
    set <variable> <value>               Set configuration <variable> to <value>.
lisky>
```

### Non-interactive use

Pass arguments and options directly from the command line. E.g.:

```sh
$ lisky get delegate lightcurve --json
```


## Settings

| Command | Description |
| --- | --- |
| <code>set json true&#124;false</code> | Sets default to json output (true) or text output (false) |
| <code>set testnet true&#124;false</code> | Set default to testnet (true) or mainnet (false) |

## Run Test

```sh
$ npm test
```

## Documentation

Further information can be found on our documentation site:

- [Introduction](https://docs.lisk.io/v1.3/docs/lisky-introduction)
- [Pre-Installation](https://docs.lisk.io/v1.3/docs/lisky-pre-installation)
- [Installation](https://docs.lisk.io/v1.3/docs/lisky-installation)
    - [Install-from-NPM](https://docs.lisk.io/v1.3/docs/lisky-installation-npm)
    - [Install-from-Source](https://docs.lisk.io/v1.3/docs/lisky-installation-source)
- [Upgrading](https://docs.lisk.io/v1.3/docs/lisky-upgrading)
    - [Upgrading-from-NPM](https://docs.lisk.io/v1.3/docs/lisky-upgrading-npm)
    - [Upgrading-from-Source](https://docs.lisk.io/v1.3/docs/lisky-upgrading-source)
- [Usage](https://docs.lisk.io/v1.3/docs/lisky-usage)
    - [Configuration](https://docs.lisk.io/v1.3/docs/lisky-usage-configuration)
    - [Usage](https://docs.lisk.io/v1.3/docs/lisky-usage-interactive-and-noninteractive)
    - [Commands](https://docs.lisk.io/v1.3/docs/lisky-usage-commands)

## Get involved

As with every repository on LiskHQ we are working intensively with GitHub open-source tools.
If you find a bug, you can create an [issue](https://github.com/LiskHQ/lisky/issues), please provide as much detail as you can.

We would be more than happy if you decide to contribute to this code and make it better along the way. Please have a look at the Lisk contribution guidelines before you start.

## License

Copyright © 2016-2017 Lisk Foundation

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see http://www.gnu.org/licenses/.
