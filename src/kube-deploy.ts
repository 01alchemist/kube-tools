const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");
const yaml = require("js-yaml");
import { launch } from "@01/launcher";
import { loadConfig } from "./config";

const cwd = process.cwd();

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

type ImageConfig = {};
type HelmConfig = {
  chartFile?: string;
  valuesFile?: string;
  chart?: any;
  values?: any;
};
type HelmManifests = {
  output: string;
  chart: any;
  values: any;
  templates: any;
};

type KubeDeployOptions = {
  values?: string; // Path to values.yml
  config?: string;
  name?: string;
  context?: string;
  image?: ImageConfig;
  helm?: HelmConfig;
  basePath?: string;
  dryRun?: boolean;
};

const defaultOptions = {
  name: "",
  basePath: ".",
  dryRun: false,
  image: {},
  helm: {},
  context: process.env.KUBE_CONTEXT || ""
};

function printConfig({
  name,
  env,
  helm: {
    chartFile,
    valuesFile,
    values: { image, replicas }
  }
}: any) {
  console.log(`    ⚙️  Deployment Configuration
      
      📦 Service name           : ${name}
      🌍 Environment            : ${env}
      💿 Image tag              : ${image.tag}
      💿 Image repository       : ${image.repository}
      💿 Image pullPolicy       : ${image.pullPolicy}
      👾 Replicas               : ${replicas}
      📋 Chart                  : ${chartFile}
      📝 Values                 : ${valuesFile}
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

const saveYaml = (_path: string, data: any) => {
  console.log("saveYaml: ", data);
  try {
    fs.outputFileSync(path.resolve(cwd, _path), yaml.safeDump(data));
  } catch (e) {
    console.error(e);
  }
};

function generateHelmManifests(manifests: HelmManifests) {
  const {
    output,
    chart,
    values,
    templates: { deployment, service }
  } = manifests;
  fs.mkdirpSync(output);
  saveYaml(output + "/chart/Chart.yaml", chart);
  saveYaml(output + "/chart/values.yaml", values);
  saveYaml(output + "/templates/deployment.yaml", deployment);
  saveYaml(output + "/templates/service.yaml", service);
}

export async function kubeDeploy(_options: KubeDeployOptions = {}) {
  let config: any = { app: {}, basePath: ".", values: {} };
  if (_options.config) {
    config = loadConfig(_options.config);
  }
  // console.log(config);

  let options: KubeDeployOptions = {
    ...defaultOptions,
    ...config.app,
    ..._options,
    basePath: config.basePath
  };

  console.log(options.helm);

  generateHelmManifests(config.app.helm);

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
