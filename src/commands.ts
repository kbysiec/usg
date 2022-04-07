import chalk from "chalk";
import enquirer from "enquirer";

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

export async function create() {
  printTitle();
  const projectName = await getProjectName();
  console.log(projectName);
}
