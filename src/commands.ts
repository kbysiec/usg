import chalk from "chalk";
import enquirer from "enquirer";
import fs from "fs-extra";
import ora from "ora";
import path from "path";
import shell from "shelljs";

const spinner = ora({ color: "gray" });

interface Template {
  name: string;
  url: string;
  description: string;
}

interface PackageJson {
  name: string;
}

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

export async function create() {
  const templates = readTemplates();

  printTitle();
  const projectName = await getProjectName();
  const projectPath = getNormalizedProjectPath(projectName);
  const templateName = await getTemplateName(templates);
  const template = templates.find((t) => t.name === templateName);
  if (template) {
    await cloneRepository(projectPath, templateName, template.url);
    updateProjectPackageJsonNamed(projectPath, projectName);
  }
}
