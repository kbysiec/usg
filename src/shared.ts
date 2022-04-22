import { PackageJson } from "./types";

export function isAnyDependency(packageJson: PackageJson) {
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
