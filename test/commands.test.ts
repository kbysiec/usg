import chalk from "chalk";
import enquirer from "enquirer";
import fs from "fs-extra";
import path from "path";
import shell from "shelljs";
import tree from "tree-node-cli";
import { create } from "../src/commands";

const mockFail = jest.fn();

jest.mock("ora", () => {
  return jest.fn(() => ({
    start: jest.fn(),
    succeed: jest.fn(),
    fail: mockFail,
  }));
});
jest.mock("tree-node-cli");

describe("commands", () => {
  let logSpy: jest.SpyInstance;
  let readJSONSyncSpy: jest.SpyInstance;
  let writeJSONSyncSpy: jest.SpyInstance;
  let pathExistsSyncSpy: jest.SpyInstance;
  let promptSpy: jest.SpyInstance;
  let execSpy: jest.SpyInstance;
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
      readJSONSyncSpy = jest
        .spyOn(fs, "readJSONSync")
        .mockReturnValueOnce([template])
        .mockReturnValue({ name: "old-name" });
      writeJSONSyncSpy = jest.spyOn(fs, "writeJSONSync").mockImplementation();
      pathExistsSyncSpy = jest
        .spyOn(fs, "pathExistsSync")
        .mockReturnValue(false);
      promptSpy = jest
        .spyOn(enquirer, "prompt")
        .mockResolvedValueOnce({ projectName })
        .mockResolvedValueOnce({ templateName: template.name });
      execSpy = jest.spyOn(shell, "exec");
      (tree as jest.Mock).mockClear();
    });
    afterEach(() => {
      jest.restoreAllMocks();
      mockFail.mockClear();
    });
    afterAll(() => {
      jest.unmock("ora");
      jest.unmock("tree-node-cli");
    });

    it("should print logo", async () => {
      execSpy.mockImplementation((_comm, _opts, callback) => callback(0));

      const logo = chalk.blue(`
    ##     ##  ######   ######
    ##     ## ##    ## ##    ##
    ##     ## ##       ##
    ##     ##  ######  ##   ####
    ##     ##       ## ##    ##
    ##     ## ##    ## ##    ##
     #######   ######   ######
  `);
      await create(false, false);
      expect(logSpy).nthCalledWith(1, logo);
    });

    it("should clone successfylly the chosen template", async () => {
      execSpy.mockImplementation((_comm, _opts, callback) => callback(0));

      await create(false, false);

      expect(execSpy.mock.calls[0][0]).toEqual(
        `git clone ${template.url} ${projectPath}`
      );
    });

    it("should update template package.json name property to project name", async () => {
      const packageJsonPath = path.join(projectPath, "package.json");
      execSpy.mockImplementation((_comm, _opts, callback) => callback(0));
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
      await create(false, true);

      expect(execSpy.mock.calls[1][0]).toEqual(`cd ${projectPath} && git init`);
    });

    it("should print folder structure for copied template", async () => {
      execSpy.mockImplementation((_comm, _opts, callback) => callback(0));
      const testStructure = "test structure";
      (tree as jest.Mock).mockReturnValue(testStructure);

      await create(false, false);

      expect(logSpy.mock.calls[2][0]).toEqual(testStructure);
    });

    it("should handle unexpected error and print error callstack", async () => {
      const error = Error("test error");
      execSpy.mockImplementationOnce((_comm, _opts, callback) =>
        callback(1, null, error)
      );
      readJSONSyncSpy.mockReturnValue([template]);

      await create(false, false);

      expect(mockFail).toHaveBeenCalledWith(error.stack);
    });

    it("should handle operation cancellation by user", async () => {
      const error = "";
      execSpy.mockImplementationOnce((_comm, _opts, callback) =>
        callback(1, null, error)
      );
      readJSONSyncSpy.mockReturnValue([template]);

      await create(false, false);

      expect(mockFail).toHaveBeenCalledWith("Operation cancelled by user");
    });

    it("should handle passing empty project name", async () => {
      promptSpy.mockReset().mockResolvedValueOnce([""]);
      readJSONSyncSpy.mockReturnValue([template]);

      await create(false, false);

      expect(mockFail).toHaveBeenCalledWith(
        "Project name is empty.\n  Operation cancelled"
      );
    });

    it("should handle passing existing project name", async () => {
      pathExistsSyncSpy.mockReset().mockReturnValue(true);
      readJSONSyncSpy.mockReturnValue([template]);

      await create(false, false);

      expect(mockFail).toHaveBeenCalledWith(
        "Target directory already exists.\n  Operation cancelled"
      );
    });

    it("should handle passing not existing template name", async () => {
      promptSpy
        .mockReset()
        .mockResolvedValueOnce({ projectName })
        .mockResolvedValueOnce({ templateName: "not existing template name" });
      readJSONSyncSpy.mockReturnValue([template]);

      await create(false, false);

      expect(mockFail).toHaveBeenCalledWith(
        "Chosen template doesn't exist. Choose another one.\n  Operation cancelled"
      );
    });

    it("should handle missing url for chosen template", async () => {
      readJSONSyncSpy
        .mockReset()
        .mockReturnValueOnce([{ ...template, url: undefined }]);
      readJSONSyncSpy.mockReturnValue([template]);

      await create(false, false);

      expect(mockFail).toHaveBeenCalledWith(
        "Chosen template doesn't have url. Choose another one.\n  Operation cancelled"
      );
    });
  });
});
