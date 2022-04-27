import chalk from "chalk";
import enquirer from "enquirer";
import fs from "fs-extra";
import path from "path";
import shell from "shelljs";
import tree from "tree-node-cli";
import { create } from "../src/commands";

const mockFail = jest.fn();
const mockStart = jest.fn();

jest.mock("ora", () => {
  return jest.fn(() => ({
    start: mockStart,
    succeed: jest.fn(),
    fail: mockFail,
  }));
});
jest.mock("tree-node-cli");

describe("commands", () => {
  let spyLog: jest.SpyInstance;
  let spyReadJSONSync: jest.SpyInstance;
  let spyWriteJSONSync: jest.SpyInstance;
  let spyPathExistsSync: jest.SpyInstance;
  let spyPrompt: jest.SpyInstance;
  let spyExec: jest.SpyInstance;
  const template = {
    name: "test-template-1",
    url: "https://test-template-1-url.testDomain",
    description: "This is template entry only for testing purposes",
  };
  const projectName = "test-project-name";
  const projectPath = path.join(__dirname, "..", projectName);

  describe("create", () => {
    beforeEach(() => {
      spyLog = jest.spyOn(console, "log").mockImplementation();
      spyReadJSONSync = jest
        .spyOn(fs, "readJSONSync")
        .mockReturnValueOnce({ vite: [template] })
        .mockReturnValue({ name: "old-name" });
      spyWriteJSONSync = jest.spyOn(fs, "writeJSONSync").mockImplementation();
      spyPathExistsSync = jest
        .spyOn(fs, "pathExistsSync")
        .mockReturnValue(false);
      spyPrompt = jest
        .spyOn(enquirer, "prompt")
        .mockResolvedValueOnce({ projectName })
        .mockResolvedValueOnce({ templateType: "vite" })
        .mockResolvedValueOnce({ templateName: template.name });
      spyExec = jest.spyOn(shell, "exec");
      (tree as jest.Mock).mockClear();
    });
    afterEach(() => {
      jest.restoreAllMocks();
      mockFail.mockClear();
      mockStart.mockClear();
    });
    afterAll(() => {
      jest.unmock("ora");
      jest.unmock("tree-node-cli");
    });

    it("should print logo", async () => {
      const logo = chalk.cyan(`
    ##     ##  ######   ######
    ##     ## ##    ## ##    ##
    ##     ## ##       ##
    ##     ##  ######  ##   ####
    ##     ##       ## ##    ##
    ##     ## ##    ## ##    ##
     #######   ######   ######
  `);
      await create(false, false);
      expect(spyLog).nthCalledWith(1, logo);
    });

    it("should clone successfylly the chosen template", async () => {
      await create(false, false);

      expect(spyExec.mock.calls[0][0]).toEqual(
        `git clone ${template.url} ${projectPath}`
      );
    });

    it("should update template package.json name property to project name", async () => {
      spyExec.mockImplementation((_comm, _opts, callback) => callback(0));
      const packageJsonPath = path.join(projectPath, "package.json");
      await create(false, false);

      expect(spyWriteJSONSync).toHaveBeenCalledWith(
        packageJsonPath,
        {
          name: projectName,
        },
        { spaces: 2 }
      );
    });

    it("should install npm dependencies if shouldAutoInstallDependencies is true", async () => {
      spyExec.mockImplementation((_comm, _opts, callback) => callback(0));
      spyReadJSONSync
        .mockReturnValueOnce({ vite: [template] })
        .mockReturnValue({
          name: "old-name",
          dependencies: { test: "0.0.0" },
          devDependencies: { test: "0.0.0" },
          peerDependencies: { test: "0.0.0" },
        });

      await create(true, false);

      expect(spyExec.mock.calls[1][0]).toEqual(
        `cd ${projectPath} && npm install`
      );
    });

    it("should reinitialize git repository if shouldReinitializeGit is true", async () => {
      spyExec.mockImplementation((_comm, _opts, callback) => callback(0));
      await create(false, true);

      expect(spyExec.mock.calls[1][0]).toEqual(`cd ${projectPath} && git init`);
    });

    it("should print folder structure for copied template", async () => {
      spyExec.mockImplementation((_comm, _opts, callback) => callback(0));
      const testStructure = "test structure";
      (tree as jest.Mock).mockReturnValue(testStructure);

      await create(false, false);

      expect(spyLog.mock.calls[2][0]).toEqual(testStructure);
    });

    it("should handle unexpected error and print error callstack", async () => {
      const error = Error("test error");
      spyExec.mockImplementationOnce((_comm, _opts, callback) =>
        callback(1, null, error)
      );

      await create(false, false);

      expect(mockFail).toHaveBeenCalledWith(chalk.red(error.stack));
    });

    it("should handle operation cancellation by user", async () => {
      const error = "";
      spyExec.mockImplementationOnce((_comm, _opts, callback) =>
        callback(1, null, error)
      );

      await create(false, false);

      expect(mockFail).toHaveBeenCalledWith(
        chalk.red("Operation cancelled by user")
      );
    });

    it("should handle passing empty project name", async () => {
      spyPrompt.mockReset().mockResolvedValueOnce([""]);

      await create(false, false);

      expect(mockFail).toHaveBeenCalledWith(
        chalk.red("Project name is empty.\n  Operation cancelled")
      );
    });

    it("should handle passing existing project name", async () => {
      spyPathExistsSync.mockReset().mockReturnValue(true);

      await create(false, false);

      expect(mockFail).toHaveBeenCalledWith(
        chalk.red("Target directory already exists.\n  Operation cancelled")
      );
    });

    it("should handle passing not existing template name", async () => {
      spyPrompt
        .mockReset()
        .mockResolvedValueOnce({ projectName })
        .mockResolvedValueOnce({ templateType: "vite" })
        .mockResolvedValueOnce({ templateName: "not existing template name" });

      await create(false, false);

      expect(mockFail).toHaveBeenCalledWith(
        chalk.red(
          "Chosen template doesn't exist. Choose another one.\n  Operation cancelled"
        )
      );
    });

    it("should handle missing url for chosen template", async () => {
      spyReadJSONSync
        .mockReset()
        .mockReturnValueOnce({ vite: [{ ...template, url: undefined }] });

      await create(false, false);

      expect(mockFail).toHaveBeenCalledWith(
        chalk.red(
          "Chosen template doesn't have url. Choose another one.\n  Operation cancelled"
        )
      );
    });

    it("should return message with listed dependencies to install", async () => {
      spyExec.mockImplementation((_comm, _opts, callback) => callback(0));

      // printing listing dependencies

      spyReadJSONSync
        .mockReturnValueOnce({ vite: [template] })
        .mockReturnValue({
          name: "old-name",
          dependencies: { test: "0.0.0", test2: "0.0.0", test3: "0.0.0" },
          devDependencies: {},
          peerDependencies: {},
        });

      await create(true, false);

      expect(mockStart.mock.calls[2][0].replace(/\s/g, "")).toEqual(
        `Installing npm packages... dependencies: ${chalk.cyan(
          "test\n test2\n test3"
        )}`.replace(/\s/g, "")
      );

      // printing listing devDependencies

      spyPrompt
        .mockResolvedValueOnce({ projectName })
        .mockResolvedValueOnce({ templateType: "vite" })
        .mockResolvedValueOnce({ templateName: template.name });

      spyReadJSONSync
        .mockReturnValueOnce({ vite: [template] })
        .mockReturnValue({
          name: "old-name",
          dependencies: {},
          devDependencies: { test: "0.0.0", test2: "0.0.0", test3: "0.0.0" },
          peerDependencies: {},
        });

      await create(true, false);

      expect(mockStart.mock.calls[5][0].replace(/\s/g, "")).toEqual(
        `Installing npm packages... devDependencies: ${chalk.cyan(
          "test\n test2\n test3"
        )}`.replace(/\s/g, "")
      );

      // printing listing peerDependencies

      spyPrompt
        .mockResolvedValueOnce({ projectName })
        .mockResolvedValueOnce({ templateType: "vite" })
        .mockResolvedValueOnce({ templateName: template.name });

      spyReadJSONSync
        .mockReturnValueOnce({ vite: [template] })
        .mockReturnValue({
          name: "old-name",
          dependencies: {},
          devDependencies: {},
          peerDependencies: { test: "0.0.0", test2: "0.0.0", test3: "0.0.0" },
        });

      await create(true, false);

      expect(mockStart.mock.calls[8][0].replace(/\s/g, "")).toEqual(
        `Installing npm packages... peerDependencies: ${chalk.cyan(
          "test\n test2\n test3"
        )}`.replace(/\s/g, "")
      );
    });
  });
});
