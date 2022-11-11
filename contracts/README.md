# Tracy Tron

### Please Note that build/ contains the build cache for the contracts deployed to the Nile Testnet.

Requirements:

- Docker
- nodejs >= v14.18.2

Pull Tron Quickstart Image: <br>
https://github.com/tron-us/docker-tron-quickstart <br>

Optionally more accounts and balance can be adjusted.

## Get started

To view every command run: `npm start -- --help`<br>

## Setup

- use Replace all ".networks[9]" to select your network. Network 9 is the local node from the docker image

1. Run Tron Quickstart Docker image
2. Install dependencies: <br>`npm install`
3. Install tronbox: <br>`npm install -g tronbox`
4. Install compiler: <br>`tronbox --download-compiler 0.8.6`
5. Deploy contracts: <br>`tronbox migrate`
6. Deploy TRC20 contracts: <br>`npm start -- create-tokens`
7. Create SocialSwap Pairs: <br>`npm start -- create-pairs --all`
8. Fill Pairs: <br> `npm start -- fill-pairs --all`
9. Add adapters to TracyRouter: <br> `npm start -- add-adapters`

After `tronbox migrate`, you can also run setup.bat if you are on Windows.

## Testing

When the Tron Quickstart Docker Image is running. <br>
Run: `tronbox test` to run tests.

## Useful commands

`jq -r ".networks | to_entries | .[0] | .value | .address" .\build\contracts\SocialSwapAdapter.json`
`jq -r ".networks | to_entries | .[0] | .value | .address" .\build\contracts\SocialSwapRouter.json`

Mint Token to TracyRouter:
`npm start -- mint (jq -r '.[<INDEX>] | .address' logs/tokens.json) (jq -r '.networks | to_entries | .[0] | .value | .address' .\build\contracts\TracyRouter.json) <AMOUNT>`

`npm start -- approveToken (jq -r '.[<INDEX>] | .address' logs/tokens.json)`

`npm start -- approveRouter (jq -r '.networks | to_entries | .[0] | .value | .address' .\build\contracts\SocialSwapAdapter.json) (jq -r '.[0] | .address' logs/tokens.json)`

`npm start -- swapExactTokensForTokens (jq -r ".networks | to_entries | .[0] | .value | .address" .\build\contracts\SocialSwapAdapter.json) 1000000 (jq -r '.[0] | .address' logs/tokens.json) (jq -r '.[1] | .address' logs/tokens.json)`
