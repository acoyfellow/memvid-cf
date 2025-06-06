import alchemy from "alchemy";
import {
  D1Database,
  R2Bucket,
  Worker,
  WranglerJson,
} from "alchemy/cloudflare";

const BRANCH_PREFIX = process.env.BRANCH_PREFIX ?? process.env.USER ?? "";
const app = await alchemy("memvid-cf", {
  stage: BRANCH_PREFIX || undefined,
  phase: process.argv.includes("--destroy") ? "destroy" : "up",
});

// Create D1 database for storing embeddings
export const database = await D1Database(`memvid-db${BRANCH_PREFIX}`, {
  name: `memvid-db${BRANCH_PREFIX}`,
  adopt: true,
});

// Create R2 bucket for storing QR codes
export const qrBucket = await R2Bucket(`qr-bucket${BRANCH_PREFIX}`, {
  name: `qr-bucket${BRANCH_PREFIX}`,
  adopt: true,
});

// Create the main worker
export const worker = await Worker(`memvid-worker${BRANCH_PREFIX}`, {
  entrypoint: "./src/worker.tsx",
  bindings: {
    DB: database,
    QR_BUCKET: qrBucket,
    AI: "@cf/baai/bge-base-en-v1.5",
  },
  url: true,
  bundle: {
    metafile: true,
    format: "esm",
    target: "es2020",
  },
  adopt: true,
});

// Generate wrangler.jsonc for local development
await WranglerJson("wrangler.jsonc", {
  worker,
});

console.log(`Worker URL: ${worker.url}`);

await app.finalize(); 