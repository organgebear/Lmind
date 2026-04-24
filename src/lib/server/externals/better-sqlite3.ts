import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const betterSqlite3 = require("better-sqlite3");

export const Database = betterSqlite3;
