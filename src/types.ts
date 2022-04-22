export interface Template {
  name: string;
  url: string;
  description: string;
}

export interface PackageJson {
  name?: string;
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
  peerDependencies?: { [key: string]: string };
}

export type SpinnerMessageType = "start" | "succeed" | "fail";
