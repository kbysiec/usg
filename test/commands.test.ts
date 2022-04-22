import chalk from "chalk";
import enquirer from "enquirer";
import fs from "fs-extra";
import ora from "ora";
import path from "path";
import shell from "shelljs";
import tree from "tree-node-cli";
import { create } from "../src/commands";

jest.mock("ora", () =>
  jest.fn().mockReturnValue({
    start: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
  })
);

jest.mock("ora");
jest.mock("tree-node-cli");

describe("commands", () => {
  let logSpy: jest.SpyInstance;
  let readJSONSyncSpy: jest.SpyInstance;
  let writeJSONSyncSpy: jest.SpyInstance;
  let execSpy: jest.SpyInstance;
  let startMock: jest.Mock;
  let succeedMock: jest.Mock;
  let failMock: jest.Mock;
  const template = {
    name: "test-template-1",
    url: "https://test-template-1-url.testDomain",
    description: "This is template entry only for testing purposes",
  };
  const projectName = "test-project-name";
  const projectPath = path.join(process.cwd(), projectName);

  describe("create", () => {
    beforeEach(() => {
      logSpy = jest.spyOn(console, "log").mockImplementation();
      readJSONSyncSpy = jest.spyOn(fs, "readJSONSync");
      writeJSONSyncSpy = jest.spyOn(fs, "writeJSONSync").mockImplementation();
      jest
        .spyOn(enquirer, "prompt")
        .mockResolvedValueOnce({ projectName })
        .mockResolvedValueOnce({ templateName: template.name });
      execSpy = jest.spyOn(shell, "exec");
      startMock = jest.fn();
      succeedMock = jest.fn();
      failMock = jest.fn();
      (tree as jest.Mock).mockClear();
      (ora as unknown as jest.Mock).mockImplementation(() => ({
        start: startMock,
        succeed: succeedMock,
        fail: failMock,
      }));
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });
    afterAll(() => {
      jest.unmock("ora");
      jest.unmock("tree-node-cli");
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
      readJSONSyncSpy.mockReturnValue([]);
      await create(false, false);
      expect(logSpy).nthCalledWith(1, logo);
    });

    it("should clone successfylly the chosen template", async () => {
      execSpy.mockImplementation((_comm, _opts, callback) => callback(0));
      readJSONSyncSpy.mockReturnValue([template]);

      await create(false, false);

      expect(execSpy.mock.calls[0][0]).toEqual(
        `git clone ${template.url} ${projectPath}`
      );
    });

    it("should update template package.json name property to project name", async () => {
      const packageJsonPath = path.join(projectPath, "package.json");
      execSpy.mockImplementation((_comm, _opts, callback) => callback(0));
      readJSONSyncSpy
        .mockReturnValueOnce([template])
        .mockReturnValue({ name: "old-name" });

      await create(false, false);

      expect(writeJSONSyncSpy).toHaveBeenCalledWith(
        packageJsonPath,
        {
          name: projectName,
        },
        { spaces: 2 }
      );
    });

    it("should install npm dependencies if shouldAutoInstallDependencies is true", async () => {
      execSpy.mockImplementation((_comm, _opts, callback) => callback(0));
      readJSONSyncSpy.mockReturnValueOnce([template]).mockReturnValue({
        name: "old-name",
        dependencies: { test: "0.0.0" },
        devDependencies: { test: "0.0.0" },
        peerDependencies: { test: "0.0.0" },
      });

      await create(true, false);

      expect(execSpy.mock.calls[1][0]).toEqual(
        `cd ${projectPath} && npm install`
      );
    });

    it("should reinitialize git repository if shouldReinitializeGit is true", async () => {
      execSpy.mockImplementation((_comm, _opts, callback) => callback(0));
      readJSONSyncSpy.mockReturnValueOnce([template]).mockReturnValue({
        name: "old-name",
      });

      await create(false, true);

      expect(execSpy.mock.calls[1][0]).toEqual(`cd ${projectPath} && git init`);
    });

    it("should print folder structure for copied template", async () => {
      execSpy.mockImplementation((_comm, _opts, callback) => callback(0));
      readJSONSyncSpy.mockReturnValueOnce([template]).mockReturnValue({
        name: "old-name",
      });
      const testStructure = "test structure";
      (tree as jest.Mock).mockReturnValue(testStructure);

      await create(false, false);

      expect(logSpy.mock.calls[2][0]).toEqual(testStructure);
    });
  });
});
