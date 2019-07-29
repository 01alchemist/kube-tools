const path = require("path");
const chalk = require("chalk");
import { launch } from "@01/launcher";
import { loadConfig } from "./config";

type HemlUpgradeOptions = {
  name: string;
  chart: string;
  values?: string;
  imageTag: string;
};

// prettier-ignore
const helm = ({name, imageTag, chart, values}:HemlUpgradeOptions) => [
  "helm",
  "upgrade",                            // Upgrade service
  "--dry-run",                          // Install if service not exist
  "--install",                          // Install if service not exist
  ...(values?["--values", values]:[]),  // helm/stage-helm-values.yml
  "--set", `image.tag=${imageTag}`,     // image.tag=${CIRCLE_SHA1}
  name,                                 // Release name
  chart                                 // helm/chart
];

const { white, red, blue, bgRed: bgR } = chalk;

type KubeDeployOptions = {
  chart?: string;
  values?: string; // Path to values.yml
  config?: string;
  name?: string;
  context?: string;
  "image.tag"?: string;
  basePath?: string;
  __values?: any; //Actual values of values.yml
};

const defaultOptions = {
  chart: "",
  name: "",
  "image.tag": "",
  basePath: ".",
  context: process.env.KUBE_CONTEXT || "stage-cluster"
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

export async function kubeDeploy(_options: KubeDeployOptions = {}) {
  let options = {
    ...defaultOptions,
    ..._options
  };
  let config = null;
  if (options.config) {
    config = loadConfig(options.config);

    options = {
      ...options,
      ...config.app,
      basePath: config.basePath,
      __values: config.values
    };
  }
  const cwd = process.cwd();
  const { basePath, chart: _chart, values: _values } = options;
  options.chart = path.resolve(cwd, basePath, _chart);
  options.values = path.resolve(cwd, basePath, _values);

  const { chart, name, "image.tag": imageTag, values } = options;

  if (!name) {
    console.log(
      red(
        `
  Oops 😬, Did you forgot to pass option ${bgR(
    white(" service ")
  )}?. Please tell me, which service you want to deploy!
        `
      )
    );
    process.exit(1);
  }

  if (!imageTag) {
    console.log(
      red(
        `
  Oops 😬, Did you forgot to pass option ${bgR(
    white(" image.tag ")
  )}?. Please tell me, which image tag you want to deploy!
        `
      )
    );
    process.exit(1);
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
    /**
     * Helm upgrade if already deployed
     */
    console.log(
      blue(`
    🧩  Upgrading ${name} ...
    `)
    );
    printConfig(options);
  } else {
    /**
     * Helm install if not deployed
     */
    console.log(`Installing ${name} ...`);
  }
  try {
    await launch({
      cmds: helm({
        name,
        chart,
        imageTag,
        values
      })
    });

    return 0;
  } catch (e) {
    console.error(e);
    return 1;
  }
}
