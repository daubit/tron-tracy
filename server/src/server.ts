import dotenv from "dotenv";
import express from "express";
import { PairSchema } from "./schema";
import mongoose from "mongoose";
import { Router } from "./types";

dotenv.config();
const app = express();
app.use(express.json());

const conn = mongoose.createConnection("mongodb://localhost:27017");
const PairModel = conn.model("Pair", PairSchema);
type PairT = typeof PairModel;

const PORT = process.env["PORT"] ?? 8080;

function cleanDoc(doc: any) {
  return {
    ...(doc.toObject ? doc.toObject() : doc),
    _id: undefined,
    history: undefined,
    __v: undefined,
  };
}

app.get("/:router/:tokenA/:tokenB/latest", async (req, res) => {
  const sortedTokens = [req.params.tokenA, req.params.tokenB].sort();
  const pair = await PairModel.findOne({
    tokenA: sortedTokens[0],
    tokenB: sortedTokens[1],
  });
  if (pair) {
    res.json(cleanDoc(pair));
  } else {
    res.json({ error: "no pair found" });
  }
});

app.get("/:tokenA/:tokenB/latest", async (req, res) => {
  const sortedTokens = [req.params.tokenA, req.params.tokenB].sort();
  const pairs = await PairModel.find({
    tokenA: sortedTokens[0],
    tokenB: sortedTokens[1],
  });
  if (pairs) {
    res.json(pairs.map((x) => cleanDoc(x)));
  } else {
    res.json({ error: "no pair found" });
  }
});

function getState(pair) {
  return [
    [
      {
        lastUpdateAt: pair.lastUpdateAt,
        tokenAReserve: pair.tokenAReserve,
        tokenBReserve: pair.tokenBReserve,
      },
    ],
    pair.history.map((x) => {
      return {
        lastUpdateAt: x.updateAt,
        tokenAReserve: x.tokenAReserve,
        tokenBReserve: x.tokenBReserve,
      };
    }),
  ];
}

app.get("/:tokenA/:tokenB/:block", async (req, res) => {
  const sortedTokens = [req.params.tokenA, req.params.tokenB].sort();
  const pairs = await PairModel.find({
    tokenA: sortedTokens[0],
    tokenB: sortedTokens[1],
  });
  const states = pairs
    .map((x) => {
      return getState(x.toObject())
        .flat()
        .map((y) => {
          return {
            ...y,
            router: x.router,
            tokenA: x.tokenA,
            tokenB: x.tokenB,
            address: x.address,
          };
        });
    })
    .flat();
  const nearestLow: any[] = [];
  const nearestHigh: any[] = [];
  for (const router of [0, 1]) {
    for (const state of states.filter((x) => x.router === router)) {
      if (
        (nearestLow[router] === undefined ||
          state.lastUpdateAt >= nearestLow[router].lastUpdateAt) &&
        state.lastUpdateAt <= req.params.block
      ) {
        nearestLow[router] = state;
      }
      if (
        (nearestHigh[router] === undefined ||
          state.lastUpdateAt <= nearestHigh[router].lastUpdateAt) &&
        state.lastUpdateAt > req.params.block
      ) {
        nearestHigh[router] = state;
      }
    }
  }
  if (pairs) {
    res.json(
      [...nearestLow, ...nearestHigh]
        .filter((x) => x !== undefined)
        .map((x) => cleanDoc(x))
    );
  } else {
    res.json({ error: "no pair found" });
  }
});

app.get("/", (req, res) => {
  res.send("Tron Server");
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
