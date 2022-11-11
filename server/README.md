# Tracy Tron Server

## Setup

- copy build/contracts from the contracts folder to src/contracts
- use Replace all ".networks[9]" to select your network. Network 9 is the local node from the docker image

## Server

Launches a express server that connects to the local mongodb. Start it with `npm run server`

It exposes the following routes:

With

:router - Router id 0 for SocialSwap 1 for Sunswap

:tokenA - Address of tokenA

:tokenB - Address of tokenB

:block - Block Number

- /:router/:tokenA/:tokenB/latest : Returns the latest Reserve Info for the Pair on Router
- /:tokenA/:tokenB/latest : Returns the latest Reserve Info for the Pair on all Routers
- /:tokenA/:tokenB/:block : Returns the Reserve Info for the Pair on all Routers at the specified Block. If there was no update at the Block time the laste Change is reported. If there is also a later event both are provided

## Tracker

Launches a program that connects to the local mongodb. It also connects to the Tron Blockchain and inspects new Blocks for Swap Transaction and parses them.

Start it with `npm run tracker`

### Setup

- Replace the url in line 78 with the url of your tron node if not using the self hosted docker container

## Bot

Launches a program that connects to the Tron Blockchain and inspects new Blocks for Swap Transaction and parses them. If there is a arbitrage opportunity it does so using the tracy router.

Start it with `npm run bot`

### Setup

- Because to trade the TracyRouter needs tokens at line :343 and :347 tokens are minted to it in the test env
- Replace the url in line 78 with the url of your tron node if not using the self hosted docker container
