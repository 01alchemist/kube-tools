const chalk = require("chalk");
import { loadConfig } from "./config";
import { DockerBuildOptions, dockerBuild } from "./components/docker";

const { white, red, bgRed: bgRed } = chalk;

type KubeConfig = {
  app: any;
  basePath: string;
  values: any;
};

type KubeBuildOptions = {
  config: string;
  basePath?: string;
} & DockerBuildOptions;

function printConfig({
  env,
  app: {
    name,
    helm: {
      values: {
        image: { tag, repository }
      }
    }
  }
}: any) {
  console.log(`    ⚙️  Build Configuration

      📦 Service name           : ${name}
      🌍 Environment            : ${env}
      💿 Image tag              : ${tag}
      💿 Image repository       : ${repository}
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

export async function kubeBuild(_options: KubeBuildOptions) {
  let config: KubeConfig = { app: {}, basePath: ".", values: {} };

  if (!_options.config) {
    logError(" config ", "Please provide a config file!");
    process.exit(1);
    return;
  }

  if (_options.config) {
    config = loadConfig(_options.config);
  }
  const { helm } = config.app;

  const {
    image: { tag, repository: imageRepository }
  } = helm.values;

  const dockerOptions: DockerBuildOptions = {
    tag: `${imageRepository}:${tag}`
  };

  const options = {
    ..._options,
    ...dockerOptions
  };
  delete options.config;

  printConfig(config);

  try {
    await dockerBuild(options);
    return 0;
  } catch (e) {
    console.error(e);
    return 1;
  }
}
