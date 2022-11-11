import TronWeb from "tronweb";

const API_KEY = process.env["API_KEY"];
const PRIVATE_KEY = process.env["PRIVATE_KEY"];
const BASE_URL = "https://api.trongrid.io";

const headers = { "TRON-PRO-API-KEY": API_KEY };

const tronWebLive = new TronWeb({
  fullHost: BASE_URL,
  privateKey: PRIVATE_KEY,
  headers,
});

const tronWebDev = new TronWeb(
  "http://127.0.0.1:9090",
  "http://127.0.0.1:9090",
  "http://127.0.0.1:9090",
  "da146374a75310b9666e834ee4ad0866d6f4035967bfc76217c5a495fff9f0d0"
);

export const tronWeb = tronWebDev;
