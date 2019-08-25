import { launch } from "@01/launcher";
import { spreadArgs } from "./docker-args";
import { ArgMap } from "~/common/types";

export type DockerBuildOptions = {
  tag?: string;
  file?: string;
  context?: string;
} & ArgMap;

const cwd = process.cwd();
const edgeFolderName = cwd.substring(cwd.lastIndexOf("/") + 1, cwd.length);
const defaultBuildOptions: ArgMap = {
  file: `${cwd}/Dockerfile`,
  "build-arg": ["NPM_TOKEN"],
  context: "."
};

/**
 * Merge default and given options
 * @param options
 */
const getOptions = (options: DockerBuildOptions) => {
  const __options = {
    ...defaultBuildOptions,
    ...options
  };
  // prettier-ignore
  const {
    t = "", tag = "",
    f = "", file = "",
    context = ".",
    ..._rest
  } = __options;

  return {
    tag: tag || <string>t,
    file: file || <string>f,
    context,
    rest: _rest
  };
};

/**
 * Docker build wrapper with default tag and NPM_TOKEN build-arg
 * @param options
 * @param launchOptions
 */
export async function dockerBuild(
  options: DockerBuildOptions = {},
  launchOptions = {}
) {
  let { file, tag, context, rest } = getOptions(options);
  if (!tag) {
    const { USER } = process.env;
    tag = `${edgeFolderName}.${USER}.dev:${Date.now()}`;
  }
  /**
   * Build docker image
   */
  // prettier-ignore
  return await launch({
    cmds: [
      "docker", "build",
      ...spreadArgs(rest),
      "--file", file,
      ...(tag? ["--tag", tag]:[]),
      context
    ],
    ...launchOptions
  });
}
