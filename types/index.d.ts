export function loadConfig(path: string): any;
type KubeDeployOptions = {
  chart?: string;
  values?: string;
  config?: string;
  name?: string;
  context?: string;
  "image.tag"?: string;
  basePath?: string;
  dryRun?: boolean;
  __values?: any;
};
export function kubeDeploy(_options?: KubeDeployOptions): Promise<1 | 0>;
