import chalk from "chalk";
import enquirer from "enquirer";
import fs from "fs-extra";
import path from "path";
import shell from "shelljs";
import { create } from "../src/commands";

jest.mock("ora", () => {
  return jest.fn().mockReturnValue({
    start: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
  });
});

describe("commands", () => {
  let logSpy: jest.SpyInstance;
  let promptSpy: jest.SpyInstance;
  let readJSONSyncSpy: jest.SpyInstance;
  let execSpy: jest.SpyInstance;

  describe("create", () => {
    beforeEach(() => {
      logSpy = jest.spyOn(console, "log");
      promptSpy = jest.spyOn(enquirer, "prompt");
      readJSONSyncSpy = jest.spyOn(fs, "readJSONSync");
      execSpy = jest.spyOn(shell, "exec");
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });
    afterAll(() => {
      jest.unmock("ora");
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
      readJSONSyncSpy.mockReturnValue([]);

      await create();
      expect(logSpy).nthCalledWith(1, logo);
    });

    it("should clone successfylly the chosen template", async () => {
      const template = {
        name: "test-template-1",
        url: "https://test-template-1-url.testDomain",
        description: "This is template entry only for testing purposes",
      };
      const projectName = "test-project-name";
      const projectPath = path.join(process.cwd(), projectName);
      logSpy.mockImplementation();
      execSpy.mockImplementation((_comm, _opts, callback) => callback(0));
      promptSpy
        .mockResolvedValueOnce({ projectName })
        .mockResolvedValueOnce({ templateName: template.name });
      readJSONSyncSpy.mockReturnValue([template]);

      await create();

      expect(execSpy.mock.calls[0][0]).toEqual(
        `git clone ${template.url} ${projectPath}`
      );
    });

    it("should error be thrown if cloning the chosen template was broken", () => {
      const errorMessage = "test error";
      const template = {
        name: "test-template-1",
        url: "https://test-template-1-url.testDomain",
        description: "This is template entry only for testing purposes",
      };
      const projectName = "test-project-name";
      logSpy.mockImplementation();
      execSpy.mockImplementation((_comm, _opts, callback) =>
        callback(1, null, errorMessage)
      );
      promptSpy
        .mockResolvedValueOnce({ projectName })
        .mockResolvedValueOnce({ templateName: template.name });
      readJSONSyncSpy.mockReturnValue([template]);

      expect(create()).rejects.toBe(errorMessage);
    });
  });
});
