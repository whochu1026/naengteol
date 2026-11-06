import { app } from "./app";
import { env } from "./config/env";
import { ensureDataFiles } from "./repositories/store";

async function main() {
  await ensureDataFiles();
  app.listen(env.port, () => {
    console.log(`냉털 API  http://localhost:${env.port}`);
    console.log(`API 문서   http://localhost:${env.port}/api/docs`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
