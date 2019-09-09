const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");
const yaml = require("js-yaml");
const util = require("util");
const crypto = require("crypto");
import { launch } from "@01/launcher";
import { loadConfig } from "./config";
import { readYamlSync } from "sls-yaml";
import { mergeObjects } from "./components/obj/merge-obj";
import { kubectl } from "./components/kubernetes";

const cwd = process.cwd();

const { white, red, blue, bgRed: bgRed } = chalk;

type ServiceConfig = {
  values: any;
  resourceFiles: any[];
  resourceDir: string;
};

type ServiceManifests = {
  output: string;
  values: any;
  resources: any;
};

type KubeValue = { name: string; value: string };

type KubeDeployOptions = {
  values?: string; // Path to values.yml
  config?: string;
  name?: string;
  context?: string;
  service?: ServiceConfig;
  set: string[]; // values override arg
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

function printConfig({ name, env, image, replicas, deployment, subset }: any) {
  console.info(`    ⚙️  Deployment Configuration
      
      📦 Service name           : ${name}
      🚀 Deployment             : ${deployment}
      🐣 Subset                 : ${subset}
      🌍 Environment            : ${env}
      💿 Image tag              : ${image.tag}
      💿 Image repository       : ${image.repository}
      💿 Image pullPolicy       : ${image.pullPolicy}
      👾 Replicas               : ${replicas}
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

const copyTemplatesToBuildDir = (_path: string) => {
  const files = fs.readdirSync(_path);
  files.forEach((file: string) => {
    console.log("file:", file);
  });
};

const copyYamlToBuildDir = (_path: string, source: any) => {
  try {
    const data = readYamlSync(path.resolve(cwd, source));
    const yamlData = yaml.safeDump(data);
    fs.outputFileSync(path.resolve(cwd, _path), yamlData);
  } catch (e) {
    console.error(e);
  }
};

function generateManifests(
  manifests: ServiceManifests,
  basePath: string
): ServiceConfig | null {
  if (manifests) {
    const { output, values, resources } = manifests;
    const buildDir = path.resolve(basePath, output);
    const resourceDir = buildDir + `/resources`;
    fs.mkdirpSync(resourceDir);

    // Generate resource yaml
    let resourceFiles: any[] = [];
    if (resources) {
      Object.keys(resources).forEach((name: string) => {
        const resource = resources[name];
        const _path = buildDir + `/resources/${name}.yaml`;
        resourceFiles.push({
          kind: resource.kind,
          name: resource.metadata.name,
          path: _path,
          content: resource
        });
        fs.outputFileSync(path.resolve(cwd, _path), yaml.safeDump(resource));
      });
    }
    return {
      resourceFiles,
      resourceDir,
      values
    };
  }
  return null;
}

export async function kubeDeploy(_options: KubeDeployOptions = defaultOptions) {
  let config: any = { app: {}, basePath: _options.basePath, values: {} };

  const setValues = _options.set || [];
  const valuesOverrides: KubeValue[] = setValues.map(setValue => {
    const [name, value] = setValue.split("=");
    return { name, value };
  });

  if (_options.config) {
    config = loadConfig(_options.config, valuesOverrides);
  }

  const basePath = config.basePath || _options.basePath;
  const values = config.app.service.values;

  const serviceConfig = generateManifests(config.app.service, basePath);

  const serviceName = values.name;
  const image = values.image;

  let options: KubeDeployOptions = {
    ...defaultOptions,
    ...config.app,
    ..._options,
    basePath,
    env: config.env,
    service: {
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
  // const services: string = await launch({
  //   cmds: ["helm", "list", "--short"],
  //   stdio: ["pipe", "pipe", process.stderr]
  // });
  // const serviceList = services.split("\n");

  // if (serviceList.includes(serviceName)) {
  //   console.info(
  //     blue(`
  //   🧩  Upgrading ${serviceName} ...
  //   `)
  //   );
  // } else {
  //   console.info(`
  //   🧩  Installing ${serviceName} ...
  //   `);
  // }

  printConfig(values);

  if (serviceConfig) {
    try {
      // Append resources
      let promises = serviceConfig.resourceFiles.map(async resourceFile => {
        try {
          const source = await kubectl(
            ["get", `${resourceFile.kind}/${resourceFile.name}`, "-o", "json"],
            { silent: true }
          );

          if (["VirtualService"].includes(resourceFile.kind)) {
            const existingResource = JSON.parse(source);
            // Delete unwanted properties
            // delete existingResource.metadata.annotations;
            // delete existingResource.metadata.creationTimestamp;
            // delete existingResource.metadata.generation;
            // delete existingResource.metadata.selfLink;
            // delete existingResource.metadata.uid;

            const mergedResource = mergeObjects(
              existingResource,
              resourceFile.content,
              { skipDuplicates: true }
            );
            // Filter duplicate entries
            const hashes: string[] = [];
            const http = mergedResource.spec.http.filter((entry: any) => {
              const md5 = crypto
                .createHash("md5")
                .update(JSON.stringify(entry))
                .digest("hex");
              if (!hashes.includes(md5)) {
                hashes.push(md5);
                return true;
              }
              return false;
            });

            console.log("http:", http);
            mergedResource.spec.http = http;
            fs.outputFileSync(resourceFile.path, yaml.safeDump(mergedResource));
            return mergedResource;
          }
        } catch (e) {
          return null;
        }
      });
      await Promise.all(promises);
      promises = serviceConfig.resourceFiles.map(async resourceFile => {
        return kubectl(["apply", "-f", resourceFile.path], {
          silent: true,
          stdio: "inherit"
        });
      });
      await Promise.all(promises);
      return 0;
    } catch (e) {
      console.error(e);
      return 1;
    }
  }
}
