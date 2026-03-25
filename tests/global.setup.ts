import { execSync } from "node:child_process";

async function globalSetup() {
  execSync("npm run seed:test-owner", {
    stdio: "inherit",
  });
}

export default globalSetup;
