import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const mysqlPromise = require("mysql2/promise");

export const mysqlPromiseModule = mysqlPromise;
