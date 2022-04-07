import chalk from "chalk";
import enquirer from "enquirer";
import { create } from "../src/commands";

describe("commands", () => {
  let logSpy: jest.SpyInstance;
  let promptSpy: jest.SpyInstance;

  describe("create", () => {
    beforeEach(() => {
      logSpy = jest.spyOn(console, "log").mockImplementation();
      promptSpy = jest.spyOn(enquirer, "prompt");
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });
    it("should print logo", async () => {
      const logo = chalk.blue(`
    ##     ##  ######   ######
    ##     ## ##    ## ##    ##
    ##     ## ##       ##
    ##     ##  ######  ##   ####
    ##     ##       ## ##    ##
    ##     ## ##    ## ##    ##
     #######   ######   ######
  `);
      logSpy.mockImplementation();
      promptSpy.mockResolvedValue({ projectName: "test-project-name" });

      await create();
      expect(logSpy).nthCalledWith(1, logo);
    });
  });
});
