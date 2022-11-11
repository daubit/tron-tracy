import { Schema, ObjectId } from "mongoose";

const PairSchema = new Schema({
  lastUpdateAt: Number,
  address: String,
  tokenAReserve: String,
  tokenBReserve: String,
  tokenA: String,
  tokenB: String,
  router: Number,
  history: [{ updateAt: Number, tokenAReserve: String, tokenBReserve: String }],
});

PairSchema.index({ router: 1, tokenA: 1 });
PairSchema.index({ router: 1, tokenB: 1 });
PairSchema.index({ tokenA: 1, tokenB: 1 });
PairSchema.index({ address: 1 });

export { PairSchema };
