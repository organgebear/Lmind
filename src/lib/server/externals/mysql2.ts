import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const mysql = require("mysql2");

export default mysql;
