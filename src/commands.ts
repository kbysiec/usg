import chalk from "chalk";
import enquirer from "enquirer";
import fs from "fs-extra";
import path from "path";
import shell from "shelljs";
import tree from "tree-node-cli";
import { print } from "./messages";
import { isAnyDependency } from "./shared";
import { PackageJson, Template } from "./types";

function readTemplates() {
  const filePath = path.join(process.cwd(), "templates.json");
  const templates: Template[] = fs.readJSONSync(filePath);
  return templates;
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
  templateName: string,
  templatePath: string
) {
  print.start.cloningRepository(templateName, templatePath);
  const command = `git clone ${templatePath} ${projectPath}`;
  await execShellCommand(command);
  print.end.cloningRepository(templateName);
}

function getPackageJsonNewName(projectName: string) {
  return projectName.substring(projectName.lastIndexOf("/") + 1);
}

function updateProjectPackageJsonName(
  projectPath: string,
  projectName: string
) {
  print.start.updatingPackageJsonName();
  const name = getPackageJsonNewName(projectName);
  const filePath = path.join(projectPath, "package.json");
  const packageJson: PackageJson = fs.readJSONSync(filePath);
  packageJson.name = name;

  fs.writeJSONSync(filePath, packageJson, { spaces: 2 });
  print.end.updatingPackageJsonName();
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

async function installDependencies(projectPath: string) {
  const packageJson: PackageJson =
    readDependenciesFromClonedTemplate(projectPath);
  if (isAnyDependency(packageJson)) {
    print.start.installingDependencies(packageJson);

    const command = `cd ${projectPath} && npm install`;
    await execShellCommand(command);
    print.end.installingDependencies();
  }
}

async function reinitializeGit(projectPath: string) {
  print.start.reinitializingGit();

  await fs.promises.rm(path.resolve(__dirname, projectPath, ".git"), {
    force: true,
    recursive: true,
  });

  const command = `cd ${projectPath} && git init`;
  await execShellCommand(command);
  print.end.reinitializingGit();
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

function ifProjectPathAlreadyExists(projectPath: string) {
  return fs.pathExistsSync(projectPath);
}

export async function create(
  shouldAutoInstallDependencies: boolean,
  shouldReinitializeGit: boolean
) {
  try {
    const templates = readTemplates();

    print.title();
    const projectName = await getProjectName();
    if (!projectName) {
      print.error.emptyProject();
      return;
    }
    const projectPath = getNormalizedProjectPath(projectName);
    const projectPathAlreadyExists = ifProjectPathAlreadyExists(projectPath);
    if (projectPathAlreadyExists) {
      print.error.pathExists();
      return;
    }
    const templateName = await getTemplateName(templates);
    const template = findTemplate(templates, templateName);
    if (!template) {
      print.error.templateDoesNotExist();
      return;
    }
    if (!template.url) {
      print.error.templateDoesNotHaveUrl();
      return;
    }
    await cloneRepository(projectPath, templateName, template.url);
    updateProjectPackageJsonName(projectPath, projectName);
    shouldAutoInstallDependencies && (await installDependencies(projectPath));
    shouldReinitializeGit && (await reinitializeGit(projectPath));
    printProjectStructure(projectPath);
  } catch (err: unknown) {
    if (err instanceof Error) {
      print.error.any(err.stack);
    } else {
      print.error.operationCancelledByUser();
    }
  }
}
