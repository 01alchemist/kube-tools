import chalk from "chalk";
import { loadConfig } from "./config";
import { DockerBuildOptions, dockerBuild } from "./components/docker";

const { white, red, bgRed: bgRed } = chalk;

type KubeValue = { name: string; value: string };

type KubeConfig = {
  app: any;
  basePath: string;
  values: any;
};

type KubeBuildOptions = {
  config: string;
  set: string[]; // values override arg
  basePath?: string;
} & DockerBuildOptions;

function printConfig({ env, name, image }: any) {
  console.info(`    ⚙️  Build Configuration

      📦 Service name           : ${name}
      🌍 Environment            : ${env}
      💿 Image tag              : ${image.tag}
      💿 Image repository       : ${image.repository}
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

export async function kubeBuild(_options: KubeBuildOptions) {
  let config: KubeConfig = { app: {}, basePath: ".", values: {} };

  if (!_options.config) {
    logError(" config ", "Please provide a config file!");
    process.exit(1);
    return;
  }

  const setValues = _options.set || [];
  const valuesOverrides: KubeValue[] = setValues.map(setValue => {
    const [name, value] = setValue.split("=");
    return { name, value };
  });

  if (_options.config) {
    config = loadConfig(_options.config, valuesOverrides);
  }
  const { service, package: pkg } = config.app;

  const {
    image: { tag, repository: imageRepository }
  } = service.values;

  const dockerOptions: DockerBuildOptions = {
    tag: `${imageRepository}:${tag}`,
    "build-arg": `PORT=${pkg.port}`
  };

  const options = {
    ..._options,
    ...dockerOptions
  };
  delete options.config;

  printConfig(service.values);

  try {
    await dockerBuild(options);
    return 0;
  } catch (e) {
    console.error(e);
    return 1;
  }
}
