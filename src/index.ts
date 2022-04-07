import sade from "sade";
import { create } from "./commands";
const prog = sade("cli");

prog.version("0.0.0");

prog
  .command("create")
  .describe("Create action")
  .action(async () => {
    await create();
  });

prog.parse(process.argv);
