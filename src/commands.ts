import chalk from "chalk";
import enquirer from "enquirer";
import fs from "fs-extra";
import ora from "ora";
import path from "path";
import shell from "shelljs";
import tree from "tree-node-cli";

const spinner = ora({ color: "gray" });

import { PackageJson, Template } from "./types";

function readTemplates() {
  const filePath = path.join(process.cwd(), "templates.json");
  const templates: Template[] = fs.readJSONSync(filePath);
  return templates;
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

async function getProjectName() {
  const { projectName } = await enquirer.prompt<{ projectName: string }>({
    type: "input",
    name: "projectName",
    message: "Project name",
  });

  return projectName;
}

function getNormalizedProjectPath(projectName: string) {
  const rootPath = process.cwd();
  return path.join(rootPath, projectName);
}

async function getTemplateName(templates: Template[]) {
  const { templateName } = await enquirer.prompt<{ templateName: string }>({
    type: "autocomplete",
    name: "templateName",
    message: "Select a template",
    choices: getTemplateChoices(templates),
    limit: 6,
  });

  return templateName;
}

function findTemplate(templates: Template[], templateName: string) {
  return templates.find((t) => t.name === templateName);
}

function getTemplateChoices(templates: Template[]) {
  return templates.map((template) => ({
    name: `* ${template.name}`,
    value: template.name,
    hint: `${chalk.blue(`- ${template.description}`)}\n(${chalk.grey(
      template.url
    )})\n`,
  }));
}

async function execShellCommand(command: string) {
  return new Promise<void>((resolve, reject) => {
    shell.exec(command, { silent: true }, (exitCode, _stdout, stderr) => {
      if (exitCode !== 0) {
        reject(stderr);
      } else {
        resolve();
      }
    });
  });
}

async function cloneRepository(
  projectPath: string,
  chosenTemplateName: string,
  chosenTemplatePath: string
) {
  spinner.start(
    `Cloning ${chalk.cyan(chosenTemplateName)} from ${chosenTemplatePath}...`
  );
  const command = `git clone ${chosenTemplatePath} ${projectPath}`;
  await execShellCommand(command);
  spinner.succeed(`Template ${chalk.cyan(chosenTemplateName)} cloned`);
}

function getPackageJsonNewName(projectName: string) {
  return projectName.substring(projectName.lastIndexOf("/") + 1);
}

function updateProjectPackageJsonNamed(
  projectPath: string,
  projectName: string
) {
  spinner.start("Updating package.json name...");
  const name = getPackageJsonNewName(projectName);
  const filePath = path.join(projectPath, "package.json");
  const packageJson: PackageJson = fs.readJSONSync(filePath);
  packageJson.name = name;

  fs.writeJSONSync(filePath, packageJson, { spaces: 2 });
  spinner.succeed(`Package.json name property updated`);
}

function readDependenciesFromClonedTemplate(projectPath: string) {
  const filePath = path.join(projectPath, "package.json");
  const packageJson: PackageJson = fs.readJSONSync(filePath);
  const { dependencies, devDependencies, peerDependencies } = packageJson;
  return {
    dependencies,
    devDependencies,
    peerDependencies,
  } as PackageJson;
}

function isAnyDependency(packageJson: PackageJson) {
  const dependencies = [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
  ];
  return dependencies.some(
    (dep: { [key: string]: string } | undefined) =>
      dep && Object.keys(dep).length > 0
  );
}

async function installDependencies(projectPath: string) {
  const packageJson: PackageJson =
    readDependenciesFromClonedTemplate(projectPath);
  if (isAnyDependency(packageJson)) {
    spinner.start(getInstallDependenciesMessage(packageJson));

    const command = `cd ${projectPath} && npm install`;
    await execShellCommand(command);
    spinner.succeed(`Npm packages installed`);
  }
}

async function reinitializeGit(projectPath: string) {
  spinner.start(`Reinitializing git repository...`);

  await fs.promises.rm(path.resolve(__dirname, projectPath, ".git"), {
    force: true,
    recursive: true,
  });

  const command = `cd ${projectPath} && git init`;
  await execShellCommand(command);
  spinner.succeed(`Git reinitialized`);
}

function getProjectStructure(projectPath: string) {
  const structure = tree(projectPath, {
    maxDepth: 1,
    sizes: true,
  });

  return structure;
}

function printProjectStructure(projectPath: string) {
  const structure = getProjectStructure(projectPath);
  console.log(chalk.blue("Project structure:\n"));
  console.log(structure);
}

export function getInstallDependenciesMessage(packageJson: PackageJson) {
  const message = `${
    isAnyDependency(packageJson)
      ? `Installing npm packages...\n${
          packageJson.dependencies
            ? `\n  dependencies:\n    ${chalk.cyan(
                Object.keys(packageJson.dependencies).join("\n    ")
              )}\n    `
            : ""
        }${
          packageJson.devDependencies
            ? `\n  devDependencies:\n    ${chalk.cyan(
                Object.keys(packageJson.devDependencies).join("\n    ")
              )}\n    `
            : ""
        }${
          packageJson.peerDependencies
            ? `\n  peerDependencies:\n    ${chalk.cyan(
                Object.keys(packageJson.peerDependencies).join("\n    ")
              )}\n    `
            : ""
        }`
      : "There are no packages to install"
  }`;

  return message;
}

export async function create(
  shouldAutoInstallDependencies: boolean,
  shouldReinitializeGit: boolean
) {
  const templates = readTemplates();

  printTitle();
  const projectName = await getProjectName();
  const projectPath = getNormalizedProjectPath(projectName);
  const templateName = await getTemplateName(templates);
  const template = findTemplate(templates, templateName);
  if (template) {
    await cloneRepository(projectPath, templateName, template.url);
    updateProjectPackageJsonNamed(projectPath, projectName);
    shouldAutoInstallDependencies && (await installDependencies(projectPath));
    shouldReinitializeGit && (await reinitializeGit(projectPath));
    printProjectStructure(projectPath);
  }
}
