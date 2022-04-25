import chalk from "chalk";
import ora from "ora";
import { PackageJson, SpinnerMessageType } from "./types";

const messages = {
  start: {
    cloningRepository: (templateName: string, templatePath: string) =>
      `Cloning ${chalk.cyan(templateName)} from ${templatePath}...`,
    updatingPackageJsonName: () => "Updating package.json name...",
    installingDependencies: (packageJson: PackageJson) =>
      getInstallDependenciesMessage(packageJson),
    reinitializingGit: () => `Reinitializing git repository...`,
  },
  succeed: {
    cloningRepository: (templateName: string) =>
      `Template ${chalk.cyan(templateName)} cloned`,
    updatingPackageJsonName: () => `Package.json name property updated`,
    installingDependencies: () => `Npm packages installed`,
    reinitializingGit: () => `Git reinitialized`,
  },
  fail: {
    operationCancelledByUser: () => "Operation cancelled by user",
    emptyProject: () => "Project name is empty.\n  Operation cancelled",
    pathExists: () => "Target directory already exists.\n  Operation cancelled",
    templateDoesNotExist: () =>
      "Chosen template doesn't exist. Choose another one.\n  Operation cancelled",
    templateDoesNotHaveUrl: () =>
      "Chosen template doesn't have url. Choose another one.\n  Operation cancelled",
  },
};

let spinner: ora.Ora;

function printWithSpinner(messageType: SpinnerMessageType, message?: string) {
  spinner = spinner || ora({ color: "gray" });
  spinner[messageType](message);
}

function printTitle() {
  const logo = `
    ##     ##  ######   ######
    ##     ## ##    ## ##    ##
    ##     ## ##       ##
    ##     ##  ######  ##   ####
    ##     ##       ## ##    ##
    ##     ## ##    ## ##    ##
     #######   ######   ######
  `;
  console.log(chalk.blue(logo));
}

function getInstallDependenciesMessage(packageJson: PackageJson) {
  const message = `${`Installing npm packages...\n${
    packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0
      ? `\n  dependencies:\n    ${chalk.cyan(
          Object.keys(packageJson.dependencies).join("\n    ")
        )}\n    `
      : ""
  }${
    packageJson.devDependencies &&
    Object.keys(packageJson.devDependencies).length > 0
      ? `\n  devDependencies:\n    ${chalk.cyan(
          Object.keys(packageJson.devDependencies).join("\n    ")
        )}\n    `
      : ""
  }${
    packageJson.peerDependencies &&
    Object.keys(packageJson.peerDependencies).length > 0
      ? `\n  peerDependencies:\n    ${chalk.cyan(
          Object.keys(packageJson.peerDependencies).join("\n    ")
        )}\n    `
      : ""
  }`}`;

  return message;
}

export const print = {
  title: printTitle,
  start: {
    cloningRepository: (templateName: string, templatePath: string) =>
      printWithSpinner(
        "start",
        messages.start.cloningRepository(templateName, templatePath)
      ),
    updatingPackageJsonName: () =>
      printWithSpinner("start", messages.start.updatingPackageJsonName()),
    installingDependencies: (packageJson: PackageJson) =>
      printWithSpinner(
        "start",
        messages.start.installingDependencies(packageJson)
      ),
    reinitializingGit: () =>
      printWithSpinner("start", messages.start.reinitializingGit()),
  },
  end: {
    cloningRepository: (templateName: string) =>
      printWithSpinner(
        "succeed",
        messages.succeed.cloningRepository(templateName)
      ),
    updatingPackageJsonName: () =>
      printWithSpinner("succeed", messages.succeed.updatingPackageJsonName()),
    installingDependencies: () =>
      printWithSpinner("succeed", messages.succeed.installingDependencies()),
    reinitializingGit: () =>
      printWithSpinner("succeed", messages.succeed.reinitializingGit()),
  },
  error: {
    any: (message?: string) => printWithSpinner("fail", message),
    operationCancelledByUser: () =>
      printWithSpinner("fail", messages.fail.operationCancelledByUser()),
    emptyProject: () => printWithSpinner("fail", messages.fail.emptyProject()),
    pathExists: () => printWithSpinner("fail", messages.fail.pathExists()),
    templateDoesNotExist: () =>
      printWithSpinner("fail", messages.fail.templateDoesNotExist()),
    templateDoesNotHaveUrl: () =>
      printWithSpinner("fail", messages.fail.templateDoesNotHaveUrl()),
  },
};
