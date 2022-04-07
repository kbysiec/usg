declare module "enquirer" {
  function prompt<T = object>(
    questions: PromptOptions | PromptOptions[]
  ): Promise<T>;
  export interface PromptOptions {
    type: string;
    name: string;
    message: string;
    choices?: {
      name: string;
      value: string;
      hint: string;
    }[];
    limit?: number;
  }
}
