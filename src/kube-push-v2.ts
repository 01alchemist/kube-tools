const chalk = require("chalk");
import { launch } from "@01/launcher";
import { loadConfig } from "./config";
import { DockerPushOptions, dockerPush } from "./components/docker";

const { white, red, bgRed: bgRed } = chalk;

type KubeValue = { name: string; value: string };

type KubeConfig = {
  app: any;
  basePath: string;
  values: any;
};

type KubePushOptions = {
  "extra-tags": string;
  config: string;
  set: string[]; // values override arg
  basePath?: string;
} & DockerPushOptions;

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

export async function kubePush(_options: KubePushOptions) {
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
  const { service } = config.app;

  const {
    image: { tag: sourceTag, repository: imageRepository }
  } = service.values;

  const { "extra-tags": _extraTags = "" } = _options;
  const extraTags: string[] = _extraTags.split(",").filter(tag => tag);
  const tags = [sourceTag, ...extraTags];
  const dockerOptions: DockerPushOptions = {
    tags: tags.map(tag => `${imageRepository}:${tag}`)
  };

  const options = {
    ..._options,
    ...dockerOptions
  };
  delete options.config;

  printConfig(service.values);

  try {
    // Retags extra tags
    const promises = extraTags.map(tag => {
      return launch({
        cmds: [
          "docker",
          "tag",
          `${imageRepository}:${sourceTag}`,
          `${imageRepository}:${tag}`
        ],
        silent: true
      });
    });
    await Promise.all(promises);

    console.info(
      `############################################################`
    );
    console.info(`# Pushing image tags [${tags}]`);
    console.info(
      `############################################################`
    );

    await dockerPush(options, { silent: true });
    return 0;
  } catch (e) {
    console.error(e);
    return 1;
  }
}
