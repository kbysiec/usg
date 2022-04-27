#!/usr/bin/env node

import fs from "fs-extra";
import path from "path";
import sade from "sade";
import { create } from "./commands";
import { PackageJson } from "./types";
const prog = sade("cli");

const filePath = path.join(process.cwd(), "package.json");
const packageJson: PackageJson = fs.readJSONSync(filePath);

prog.version(packageJson.version || "");

prog
  .command("create", "", { default: true })
  .describe("Create action")
  .option(
    "-a, --auto-install",
    "Should install automatically npm dependencies",
    true
  )
  .option("-r, --reinitialize-git", "Should reinitialize git repository", true)
  .action(async (opts) => {
    await create(opts["auto-install"], opts["reinitialize-git"]);
  });

prog.parse(process.argv);
