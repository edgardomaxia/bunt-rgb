// scripts/generateBuildInfo.mjs
import fs from "node:fs";
import path from "node:path";

const outPath = path.join(process.cwd(), "src/meta/buildInfo.ts");

const info = {
  builtAtIso: new Date().toISOString(),
  vercelEnv: process.env.VERCEL_ENV ?? "local",
  gitBranch: process.env.VERCEL_GIT_COMMIT_REF ?? "local",
  gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
  gitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "",
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? "",
};

const content = `// AUTO-GENERATED. DO NOT EDIT.
// Generated at build time.
export const BUILD_INFO = ${JSON.stringify(info, null, 2)} as const;
`;

fs.writeFileSync(outPath, content, "utf8");
console.log("generated:", outPath);