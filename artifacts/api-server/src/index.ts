import app from "./app";
import { logger } from "./lib/logger";
import { startDepositPoller } from "./lib/deposit-poller";
import { db, serverConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function loadPersistedConfig(): Promise<void> {
  if (process.env.HD_MNEMONIC) return;
  try {
    const [row] = await db.select().from(serverConfigTable).where(eq(serverConfigTable.key, "hd_mnemonic"));
    if (row?.value) {
      process.env.HD_MNEMONIC = row.value;
      logger.info("config: loaded HD_MNEMONIC from database");
    }
  } catch {
    // table may not exist on first boot before migration
  }
}

loadPersistedConfig().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
    startDepositPoller();
  });
}).catch((err) => {
  logger.error({ err }, "Failed to load config");
  process.exit(1);
});
