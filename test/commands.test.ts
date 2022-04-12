import chalk from "chalk";
import enquirer from "enquirer";
import fs from "fs-extra";
import path from "path";
import shell from "shelljs";
import {
  create,
  getInstallDependenciesMessage,
  PackageJson,
} from "../src/commands";

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
  let writeJSONSyncSpy: jest.SpyInstance;
  let execSpy: jest.SpyInstance;
  const template = {
    name: "test-template-1",
    url: "https://test-template-1-url.testDomain",
    description: "This is template entry only for testing purposes",
  };
  const projectName = "test-project-name";
  describe("create", () => {
    beforeEach(() => {
      logSpy = jest.spyOn(console, "log");
      promptSpy = jest.spyOn(enquirer, "prompt");
      readJSONSyncSpy = jest.spyOn(fs, "readJSONSync");
      writeJSONSyncSpy = jest.spyOn(fs, "writeJSONSync").mockImplementation();
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

      await create(false, false);
      expect(logSpy).nthCalledWith(1, logo);
    });

    it("should clone successfylly the chosen template", async () => {
      const projectPath = path.join(process.cwd(), projectName);
      logSpy.mockImplementation();
      execSpy.mockImplementation((_comm, _opts, callback) => callback(0));
      promptSpy
        .mockResolvedValueOnce({ projectName })
        .mockResolvedValueOnce({ templateName: template.name });
      readJSONSyncSpy.mockReturnValue([template]);

      await create(false, false);

      expect(execSpy.mock.calls[0][0]).toEqual(
        `git clone ${template.url} ${projectPath}`
      );
    });

    it("should error be thrown if cloning the chosen template was broken", () => {
      const errorMessage = "test error";
      logSpy.mockImplementation();
      execSpy.mockImplementation((_comm, _opts, callback) =>
        callback(1, null, errorMessage)
      );
      promptSpy
        .mockResolvedValueOnce({ projectName })
        .mockResolvedValueOnce({ templateName: template.name });
      readJSONSyncSpy.mockReturnValue([template]);

      expect(create(false, false)).rejects.toBe(errorMessage);
    });

    it("should update template package.json name property to project name", async () => {
      const projectPath = path.join(process.cwd(), projectName);
      const packageJsonPath = path.join(projectPath, "package.json");
      logSpy.mockImplementation();
      execSpy.mockImplementation((_comm, _opts, callback) => callback(0));
      promptSpy
        .mockResolvedValueOnce({ projectName })
        .mockResolvedValueOnce({ templateName: template.name });
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
      const projectPath = path.join(process.cwd(), projectName);
      logSpy.mockImplementation();
      execSpy.mockImplementation((_comm, _opts, callback) => callback(0));
      promptSpy
        .mockResolvedValueOnce({ projectName })
        .mockResolvedValueOnce({ templateName: template.name });
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
      const projectPath = path.join(process.cwd(), projectName);
      logSpy.mockImplementation();
      execSpy.mockImplementation((_comm, _opts, callback) => callback(0));
      promptSpy
        .mockResolvedValueOnce({ projectName })
        .mockResolvedValueOnce({ templateName: template.name });
      readJSONSyncSpy.mockReturnValueOnce([template]).mockReturnValue({
        name: "old-name",
      });

      await create(false, true);

      expect(execSpy.mock.calls[1][0]).toEqual(`cd ${projectPath} && git init`);
    });
  });

  describe("getInstallDependenciesMessage", () => {
    it("should return no packages to install if there is not any dependency", async () => {
      const packageJson = {
        name: "old-name",
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
      };

      expect(getInstallDependenciesMessage(packageJson)).toEqual(
        "There are no packages to install"
      );
    });

    it("should return message with listed dependencies to install", async () => {
      let packageJson: PackageJson = {
        dependencies: { test: "0.0.0", test2: "0.0.0", test3: "0.0.0" },
      };

      expect(
        getInstallDependenciesMessage(packageJson).replace(/\s/g, "")
      ).toEqual(
        `Installing npm packages... dependencies: ${chalk.cyan(
          "test\n test2\n test3"
        )}`.replace(/\s/g, "")
      );

      packageJson = {
        devDependencies: { test: "0.0.0" },
      };

      expect(
        getInstallDependenciesMessage(packageJson).replace(/\s/g, "")
      ).toEqual(
        `Installing npm packages... devDependencies: ${chalk.cyan(
          "test"
        )}`.replace(/\s/g, "")
      );

      packageJson = {
        peerDependencies: { test: "0.0.0" },
      };

      expect(
        getInstallDependenciesMessage(packageJson).replace(/\s/g, "")
      ).toEqual(
        `Installing npm packages... peerDependencies: ${chalk.cyan(
          "test"
        )}`.replace(/\s/g, "")
      );
    });
  });
});
