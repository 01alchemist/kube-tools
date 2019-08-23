const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");
const yaml = require("js-yaml");
import { launch } from "@01/launcher";
import { loadConfig } from "./config";
import { readYamlSync } from "sls-yaml";
import { mergeObjects } from "./components/obj/merge-obj";

const cwd = process.cwd();

type HelmValue = { name: string; value: string };

type HemlUpgradeOptions = {
  name: string;
  chart: string;
  values?: string;
  valuesOverrides: HelmValue[];
  dryRun?: boolean;
};

const helmValueSets = (values: HelmValue[]) =>
  values.map(({ name, value }) => [`--set`, `${name}=${value}`]).flat();

// prettier-ignore
const helm = (
  {name, chart, values, valuesOverrides, dryRun = false}:HemlUpgradeOptions
  ) => [
  "helm",
  "upgrade",                            // Upgrade service
  ...(dryRun?["--dry-run"]:[]),         // Simulate an upgrade
  "--install",                          // Install if service not exist
  ...(values?["--values", values]:[]),  // helm chart values.yml
  ...helmValueSets(valuesOverrides),    // helm values overrides
  name,                                 // Release name
  chart                                 // helm chart
];

const { white, red, blue, bgRed: bgRed } = chalk;

type HelmConfig = {
  chartDir: string;
  chartFile: string;
  valuesFile: string;
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
  chart?: string; // Path to Chart.yml
  values?: string; // Path to values.yml
  config?: string;
  name?: string;
  context?: string;
  helm?: HelmConfig;
  set: string[]; // helm values override arg
  basePath: string;
  redeploy?: boolean;
  dryRun?: boolean;
};

const defaultOptions = {
  name: "",
  basePath: ".",
  redeploy: false,
  dryRun: false,
  set: [],
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
  console.info(`    ⚙️  Deployment Configuration
      
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
  console.error(
    red(
      `
Oops 😬, Did you forgot to pass option ${bgRed(
        white(` ${prop} `)
      )}?. Please tell me, ${msg}!
    `
    )
  );

const saveJsonAsYaml = (_path: string, data: any) => {
  try {
    const yamlData = yaml.safeDump(data);
    fs.outputFileSync(path.resolve(cwd, _path), yamlData);
  } catch (e) {
    console.error(e);
  }
};

function generateHelmManifests(
  manifests: HelmManifests,
  basePath: string
): HelmConfig | null {
  if (manifests) {
    const { output, chart, values, templates } = manifests;
    const buildDir = path.resolve(basePath, output);
    const chartDir = path.resolve(buildDir, "chart");
    fs.mkdirpSync(buildDir);

    // Generate Chart and values
    const chartFile = chartDir + "/Chart.yaml";
    saveJsonAsYaml(chartFile, chart);
    const valuesFile = chartDir + "/values.yaml";
    saveJsonAsYaml(valuesFile, values);

    // Generate templates yaml
    Object.keys(templates).forEach(name => {
      const template = templates[name];
      const _path = chartDir + `/templates/${name}.yaml`;
      fs.outputFileSync(path.resolve(cwd, _path), template);
    });
    return {
      chartDir,
      chartFile,
      valuesFile,
      chart,
      values
    };
  }
  return null;
}

export async function kubeDeploy(_options: KubeDeployOptions = defaultOptions) {
  let config: any = { app: {}, basePath: _options.basePath, values: {} };
  if (_options.config) {
    config = loadConfig(_options.config);
  }
  const basePath = config.basePath || _options.basePath;
  const setValues = _options.set || [];
  const valuesOverrides: HelmValue[] = setValues.map(setValue => {
    const [name, value] = setValue.split("=");
    return { name, value };
  });

  const helmConfig = generateHelmManifests(config.app.helm, basePath);
  let { chart: chartDir = "./helm", values: valuesFile } = _options;
  let chartFile = chartDir + "/Chart.yaml";
  let values: any = {};
  let chart: any = {};

  if (helmConfig) {
    chartDir = helmConfig.chartDir;
    chartFile = helmConfig.chartFile;
    valuesFile = helmConfig.valuesFile;
    chart = helmConfig.chart;
    values = helmConfig.values;
  } else {
    if (chartFile) {
      chart = readYamlSync(chartFile);
    }
    if (valuesFile) {
      values = readYamlSync(valuesFile);
    }
  }
  values = mergeObjects(values, valuesOverrides);
  const serviceName = chart.name;
  const image = values.image;
  const { dryRun } = _options;

  let options: KubeDeployOptions = {
    ...defaultOptions,
    ...config.app,
    ..._options,
    basePath,
    env: config.env,
    helm: {
      chartFile,
      valuesFile,
      chart,
      values
    }
  };

  if (!serviceName) {
    logError(" service ", "which service you want to deploy!");
    process.exit(1);
    return;
  }

  if (!image.tag) {
    logError(" image.tag ", "which image tag you want to deploy");
    process.exit(1);
    return;
  }

  if (!chartFile) {
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

  if (serviceList.includes(serviceName)) {
    console.info(
      blue(`
    🧩  Upgrading ${serviceName} ...
    `)
    );
  } else {
    console.info(`
    🧩  Installing ${serviceName} ...
    `);
  }

  printConfig(options);

  try {
    if (options.redeploy) {
      try {
        await launch({
          cmds: ["helm", "del", "--purge", serviceName]
        });
      } catch (e) {
        // ignore
      }
    }

    await launch({
      cmds: helm({
        name: serviceName,
        dryRun,
        valuesOverrides,
        chart: chartDir
        // values: valuesFile
      })
    });

    return 0;
  } catch (e) {
    console.error(e);
    return 1;
  }
}
