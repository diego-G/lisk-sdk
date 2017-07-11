const config = require('../../config.json');
const tablify = require('../utils/tablify');
const query = require('../utils/query');


module.exports = function listCommand(vorpal) {
  function switchType(type) {
    return {
      accounts: 'account',
      addresses: 'address',
      blocks: 'block',
      delegates: 'delegate',
      transactions: 'transaction',
    }[type];
  }

  vorpal
    .command('list <type> [variadic...]')
    .option('-j, --json', 'Sets output to json')
    .option('-t, --no-json', 'Sets output to text')

    .description('Get information from <type> with parameters [input, input, ...].  \n Types available: accounts, addresses, blocks, delegates, transactions \n E.g. list delegates lightcurve tosch \n E.g. list blocks 5510510593472232540 16450842638530591789')
    .autocomplete(['accounts', 'addresses', 'blocks', 'delegates', 'transactions'])
    .action((userInput) => {
      const getType = {
        addresses: query.isAccountQuery,
        accounts: query.isAccountQuery,
        blocks: query.isBlockQuery,
        delegates: query.isDelegateQuery,
        transactions: query.isTransactionQuery,
      };

      const calls = userInput.variadic.map(input => getType[userInput.type](input));

      const shouldUseJsonOutput = (userInput.options.json === true || config.json === true)
        && userInput.options.json !== false;

      if (shouldUseJsonOutput) {
        return Promise.all(calls).then((result) => {
          result.forEach((executed) => {
            if (executed.error) {
              vorpal.log(JSON.stringify(executed));
            } else {
              vorpal.log(JSON.stringify(executed[switchType(userInput.type)]));
            }
          });

          return result;
        });
      }
      return Promise.all(calls).then((result) => {
        result.forEach((executed) => {
          if (executed.error) {
            vorpal.log(tablify(executed).toString());
          } else {
            vorpal.log(tablify(executed[switchType(userInput.type)]).toString());
          }
        });

        return result;
      }).catch(e => e);
    });
};
