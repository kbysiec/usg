import chalk from "chalk";

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

export function create() {
  printTitle();
}
