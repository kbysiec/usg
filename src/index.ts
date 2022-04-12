import sade from "sade";
import { create } from "./commands";
const prog = sade("cli");

prog.version("0.0.0");

prog
  .command("create")
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
