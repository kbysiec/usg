import chalk from "chalk";
import { create } from "../src/commands";

describe("commands", () => {
  describe("create", () => {
    it("should print logo", () => {
      const logo = chalk.blue(`
    ##     ##  ######   ######
    ##     ## ##    ## ##    ##
    ##     ## ##       ##
    ##     ##  ######  ##   ####
    ##     ##       ## ##    ##
    ##     ## ##    ## ##    ##
     #######   ######   ######
  `);
      const logSpy = jest.spyOn(console, "log").mockImplementation();
      create();
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(logo);

      logSpy.mockRestore();
    });
  });
});
