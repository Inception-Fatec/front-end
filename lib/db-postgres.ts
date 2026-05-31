import postgres from "postgres";

const sql = postgres({
  host: process.env.PG_HOST!,
  port: 5432,
  database: process.env.PG_DB!,
  username: process.env.PG_USER!,
  password: process.env.PG_PASSWORD!,
  ssl: false,
  max: 10,
});

export default sql;
