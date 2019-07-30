const path = require("path");
const chalk = require("chalk");
import { launch } from "@01/launcher";
import { loadConfig } from "./config";

type HemlUpgradeOptions = {
  name: string;
  chart: string;
  values?: string;
  imageTag: string;
  dryRun?: boolean;
};

// prettier-ignore
const helm = (
  {name, imageTag, chart, values, dryRun = false}:HemlUpgradeOptions
  ) => [
  "helm",
  "upgrade",                            // Upgrade service
  ...(dryRun?["--dry-run"]:[]),         // Simulate an upgrade
  "--install",                          // Install if service not exist
  ...(values?["--values", values]:[]),  // helm chart values.yml
  "--set", `image.tag=${imageTag}`,     // image.tag=${CIRCLE_SHA1}
  name,                                 // Release name
  chart                                 // helm chart
];

const { white, red, blue, bgRed: bgRed } = chalk;

type KubeDeployOptions = {
  chart?: string;
  values?: string; // Path to values.yml
  config?: string;
  name?: string;
  context?: string;
  "image.tag"?: string;
  basePath?: string;
  dryRun?: boolean;
  __values?: any; //Actual values of values.yml
};

const defaultOptions = {
  chart: "",
  name: "",
  "image.tag": "",
  basePath: ".",
  dryRun: false,
  context: process.env.KUBE_CONTEXT || "minikube"
};

function printConfig({
  name,
  chart,
  values,
  "image.tag": imageTag,
  __values: { env, replicas, image }
}: any) {
  console.log(`    ⚙️  Configuration
      
      📦 Service name           : ${name}
      🌍 Environment            : ${env}
      💿 Image tag              : ${imageTag}
      💿 Image repository       : ${image.repository}
      💿 Image pullPolicy       : ${image.pullPolicy}
      👾 Replicas               : ${replicas}
      📋 Chart                  : ${chart}
      📝 Values                 : ${values}
  `);
}

const logError = (prop: string, msg: string) =>
  console.log(
    red(
      `
Oops 😬, Did you forgot to pass option ${bgRed(
        white(` ${prop} `)
      )}?. Please tell me, ${msg}!
    `
    )
  );

export async function kubeDeploy(_options: KubeDeployOptions = {}) {
  let config = { app: {}, basePath: ".", values: {} };
  if (_options.config) {
    config = loadConfig(_options.config);
  }
  let options: KubeDeployOptions = {
    ...defaultOptions,
    ...config.app,
    ..._options,
    basePath: config.basePath,
    __values: config.values
  };

  const cwd = process.cwd();
  const { basePath, chart: _chart, values: _values } = options;
  options.chart = path.resolve(cwd, basePath, _chart);
  options.values = path.resolve(cwd, basePath, _values);

  const { chart, name, "image.tag": imageTag, values, dryRun } = options;

  if (!name) {
    logError(" service ", "which service you want to deploy!");
    process.exit(1);
    return;
  }

  if (!imageTag) {
    logError(" image.tag ", "which image tag you want to deploy");
    process.exit(1);
    return;
  }

  if (!chart) {
    logError(" chart ", "which chart you want to deploy!");
    process.exit(1);
    return;
  }

  const kubeContext = options.context;
  if (kubeContext) {
    /**
     * Set kubernetes context
     */
    await launch({
      cmds: ["kubectl", "config", "use-context", kubeContext]
    });
  }
  /**
   * Check if service already deployed
   */
  const services: string = await launch({
    cmds: ["helm", "list", "--short"],
    stdio: ["pipe", "pipe", process.stderr]
  });
  const serviceList = services.split("\n");

  if (serviceList.includes(name)) {
    console.log(
      blue(`
    🧩  Upgrading ${name} ...
    `)
    );
  } else {
    console.log(`
    🧩  Installing ${name} ...
    `);
  }

  printConfig(options);

  try {
    await launch({
      cmds: helm({
        name,
        chart,
        imageTag,
        values,
        dryRun
      })
    });

    return 0;
  } catch (e) {
    console.error(e);
    return 1;
  }
}
