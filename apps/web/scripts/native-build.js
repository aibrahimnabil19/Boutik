const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const apiDir = path.join(__dirname, "../src/app/api");
const tempDir = path.join(__dirname, "../src/app/__api_disabled");

try {
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, tempDir);
  }

  execSync("cross-env NEXT_PUBLIC_NATIVE_BUILD=true next build", {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });
} finally {
  if (fs.existsSync(tempDir)) {
    fs.renameSync(tempDir, apiDir);
  }
}