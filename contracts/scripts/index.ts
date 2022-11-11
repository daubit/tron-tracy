import tronWeb from "./lib/tronWeb";
import TestToken from "../build/contracts/TestToken.json";
import { hideBin } from "yargs/helpers";
import { addAdapters } from "./adapter";
import { getAccounts } from "./accounts";
import { trade } from "./trade";
import { getResource } from "./lib/utils";
import yargs, { showHelp } from "yargs";

import { approve, approveRouter, swapExactTokensForTokens } from "./tracy";
import {
  allowance,
  balanceOf,
  createTokens,
  getToken,
  getTokens,
  mint,
} from "./tokens";

import {
  createPairs as createSocialPairs,
  fillPairs as fillSocialPairs,
  getAmountsIn as getAmountsInSocial,
  getAmountsOut as getAmountsOutSocial,
  getPairs as getSocialPairs,
} from "./socialswap/pairs";
import { getFactory as getSocialFactory } from "./socialswap/factory";

import {
  createPairs as createSunPairs,
  fillPairs as fillSunPairs,
  getAmountsIn as getAmountsInSun,
  getAmountsOut as getAmountsOutSun,
  getPairs as getSunPairs,
} from "./sunswap/pairs";
import { getFactory as getSunFactory } from "./sunswap/factory";
import { tradeTracy } from "./tradeTracy";

yargs(hideBin(process.argv))
  .command(
    "create-tokens [amount]",
    "Create TRC20 Tokens",
    async (yargs) => {
      return yargs.positional("amount", {
        describe: "Amount of tokens to create",
        default: 2,
        type: "number",
      });
    },
    async (args) => {
      try {
        await createTokens(args.amount as number);
      } catch (e: any) {
        console.log(e);
      }
    }
  )
  .command(
    "tokens",
    "Display TRC20 Tokens",
    async (yargs) => {},
    async (args) => {
      const tokens = await getTokens();
      tokens.forEach((token) => console.log(token));
    }
  )
  .command(
    "token [address]",
    "Display TRC20 Token",
    (yargs) => {
      return yargs.positional("address", {
        describe: "TRC20 address to look up",
        type: "string",
      });
    },
    async (args) => {
      const address = args.address as string;
      console.log(`Fetchin data from ${address}`);
      const { name, symbol, decimals } = await getToken(address);
      console.log({ name, symbol, decimals });
      const tokenContract = await tronWeb.contract(TestToken.abi, address);
      const balance = await tokenContract
        .balanceOf(tronWeb.defaultAddress.hex)
        .call();
      const owner = await tokenContract.owner().call();
      console.log(`${owner} owns the contract!`);
      console.log(
        `${tronWeb.defaultAddress.base58} holds ${balance} ${symbol}`
      );
    }
  )
  .command(
    "mint [token] [to] [amount]",
    "Mint TRC20 Tokens",
    (yargs) => {
      return yargs
        .positional("token", {
          describe: "Token address to mint",
          type: "string",
        })
        .positional("to", {
          describe: "Tron address to mint to",
          type: "string",
        })
        .positional("amount", {
          describe: "Amount to mint",
          type: "string",
        });
    },
    async (args) => {
      try {
        await mint(
          args.token as string,
          args.to as string,
          args.amount as string
        );
        console.log(
          `Successfully minted ${args.amount as string} to ${args.to as string}`
        );
      } catch (e: any) {
        console.log(e);
      }
    }
  )
  .command(
    "balance [token] [address]",
    "Show TRC20 Tokens balance",
    (yargs) => {
      return yargs
        .positional("token", {
          describe: "Token address to look up from",
          type: "string",
        })
        .positional("address", {
          describe: "Address to show balance of",
          type: "string",
        });
    },
    async (args) => {
      try {
        const balance = await balanceOf(
          args.token as string,
          args.address as string
        );
        console.log(`${args.address as string} has ${balance.toString()}`);
      } catch (e: any) {
        console.log(e);
      }
    }
  )
  .command(
    "create-pairs",
    "Create SocialSwap Pairs",
    async (yargs) => {},
    async (args) => {
      try {
        if (args.social) {
          console.log("Social Pairs");
          await createSocialPairs();
        } else if (args.sun) {
          console.log("Sun Pairs");
          await createSunPairs();
        } else if (args.all) {
          console.log("Social Pairs");
          await createSocialPairs();
          console.log("Sun Pairs");
          await createSunPairs();
        }
      } catch (e: any) {
        console.log(e);
      }
    }
  )
  .command(
    "pairs",
    "Display Pairs",
    async (yargs) => {},
    async (args) => {
      if (args.social) {
        console.log("Social Pairs");
        const pairs = await getSocialPairs();
        pairs.forEach((pair) => console.log(pair));
      } else if (args.sun) {
        console.log("Sun Pairs");
        const pairs = await getSunPairs();
        pairs.forEach((pair) => console.log(pair));
      } else if (args.all) {
        console.log("Social Pairs");
        let pairs = await getSocialPairs();
        pairs.forEach((pair) => console.log(pair));
        console.log("Sun Pairs");
        pairs = await getSunPairs();
        pairs.forEach((pair) => console.log(pair));
      }
    }
  )
  .command(
    "fill-pairs",
    "Fill SocialSwap Pairs with values",
    async (yargs) => {},
    async (args) => {
      try {
        if (args.social) {
          console.log("Social Pairs");
          await fillSocialPairs();
        } else if (args.sun) {
          console.log("Sun Pairs");
          await fillSunPairs();
        } else if (args.all) {
          console.log("Social Pairs");
          await fillSocialPairs();
          console.log("Sun Pairs");
          await fillSunPairs();
        }
        console.log("Pairs filled!");
      } catch (e: any) {
        console.log(e);
      }
    }
  )
  .command(
    "accounts [amount]",
    "Display accounts",
    (yargs) => {
      return yargs.positional("amount", {
        describe: "Amount of Tron address to look up",
        type: "string",
      });
    },
    async (args) => {
      const accounts = await getAccounts(
        parseInt((args.amount as string) || "10")
      );
      accounts.forEach((account) => console.log(account));
    }
  )
  .command(
    "resource [address]",
    "Display resources of an account",
    (yargs) => {
      return yargs.positional("address", {
        describe: "Tron address to look up",
        type: "string",
      });
    },
    async (args) => {
      getResource(args.address as string);
    }
  )
  .command(
    "factory",
    "Display information about the Factory contract",
    (yargs) => {
      return yargs.positional("address", {
        describe: "Tron address to look up",
        type: "string",
      });
    },
    async (args) => {
      try {
        if (args.social) {
          console.log("Social Factory");
          await getSocialFactory();
        } else if (args.sun) {
          console.log("Sun Factory");
          await getSunFactory();
        } else if (args.all) {
          console.log("Social Factory");
          await getSocialFactory();
          console.log("Sun Factory");
          await getSunFactory();
        }
      } catch (e: any) {
        console.log(e);
      }
    }
  )
  .command(
    "amounts-out [amount] [addresses...]",
    "Swap using the Router contract",
    (yargs) => {
      return yargs
        .positional("amount", {
          describe: "Tron amount to swap",
        })
        .positional("addresses", {
          describe: "Token path to swap",
        });
    },
    async (args) => {
      try {
        if (args.social) {
          await getAmountsOutSocial(
            args.amount as string,
            args.addresses as string[]
          );
        } else if (args.sun) {
          await getAmountsOutSun(args.amount as string, args.path as string[]);
        } else if (args.all) {
          await getAmountsOutSocial(
            args.amount as string,
            args.addresses as string[]
          );
          await getAmountsOutSun(args.amount as string, args.path as string[]);
        }
      } catch (e: any) {
        console.log(e);
      }
    }
  )
  .command(
    "amounts-in [amount] [path...]",
    "Swap using the Router contract",
    (yargs) => {
      return yargs
        .positional("amount", {
          describe: "Tron amount to swap",
        })
        .positional("path", {
          describe: "Token path to swap",
        });
    },
    async (args) => {
      try {
        if (args.social) {
          console.log("Social Router");
          await getAmountsInSocial(
            args.amount as string,
            args.path as string[]
          );
        } else if (args.sun) {
          console.log("Sun Router");
          await getAmountsInSun(args.amount as string, args.path as string[]);
        } else if (args.all) {
          console.log("Social Router");
          await getAmountsInSocial(
            args.amount as string,
            args.path as string[]
          );
          console.log("Sun Router");
          await getAmountsInSun(args.amount as string, args.path as string[]);
        }
      } catch (e: any) {
        console.log(e);
      }
    }
  )
  .command(
    "add-adapters",
    "Add adapters to TracyRouter",
    async (yargs) => {},
    async (args) => {
      try {
        await addAdapters();
        console.log("Adapters added!");
      } catch (e: any) {
        console.log(e);
      }
    }
  )
  .command(
    "swapExactTokensForTokens [adapter] [amount] [path...]",
    "Swap TRC20 Tokens",
    (yargs) => {
      return yargs
        .positional("adapter", {
          describe: "Adapter to use",
        })
        .positional("amount", {
          describe: "Token path to swap",
        })
        .positional("path", {
          describe: "Token path to swap",
        });
    },
    async (args) => {
      try {
        await swapExactTokensForTokens(
          args.adapter as string,
          args.amount as string,
          args.path as string[]
        );
        console.log("Swap was successful!");
      } catch (e: any) {
        console.log(e);
      }
    }
  )
  .command(
    "approveToken [address]",
    "Approve TRC20 Tokens for Tracy Router",
    (yargs) => {
      return yargs.positional("address", {
        describe: "Adapter to use",
      });
    },
    async (args) => {
      try {
        await approve(args.address as string);
        console.log("Approval was successful!");
      } catch (e: any) {
        console.log(e);
      }
    }
  )
  .command(
    "approveRouter [adapterAddress] [tokenAddress]",
    "Approve Router for Adapter",
    (yargs) => {
      return yargs
        .positional("adapterAddress", {
          describe: "Adapter to approve",
        })
        .positional("tokenAddress", {
          describe: "token to approve",
        });
    },
    async (args) => {
      try {
        await approveRouter(
          args.adapterAddress as string,
          args.tokenAddress as string
        );
        console.log("Approval was successful!");
      } catch (e: any) {
        console.log(`Here: ${e}`);
      }
    }
  )
  .command(
    "allowance [tokenAddress] [owner] [spender]",
    "Approve Router for Adapter",
    (yargs) => {
      return yargs
        .positional("tokenAddress", {
          describe: "Token to get check from",
        })
        .positional("owner", {
          describe: "Owner address",
        })
        .positional("spender", {
          describe: "Spender address",
        });
    },
    async (args) => {
      try {
        const amount = await allowance(
          args.tokenAddress as string,
          args.owner as string,
          args.spender as string
        );
        console.log(`Allowance for ${args.spender} is ${amount}`);
      } catch (e: any) {
        console.log(`Here: ${e}`);
      }
    }
  )
  .command(
    "trade",
    "trade",
    (yargs) => {},
    async (args) => {
      await trade();
    }
  )
  .command(
    "tradeTracy",
    "tradeTracy",
    (yargs) => {},
    async (args) => {
      await tradeTracy();
    }
  )
  .command({
    command: "*",
    handler() {
      showHelp();
    },
  })
  .demandCommand()
  .option("social", { type: "boolean" })
  .option("sun", { type: "boolean" })
  .option("all", { type: "boolean" })
  .parse();
