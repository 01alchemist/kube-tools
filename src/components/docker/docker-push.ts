import { launch } from "@01/launcher";
import { ArgMap } from "~/common/types";
import { spreadArgs } from "./docker-args";

export type DockerPushOptions = {
  tag?: string;
  t?: string;
  tags?: string[];
} & ArgMap;

const cwd = process.cwd();
const edgeFolderName = cwd.substring(cwd.lastIndexOf("/") + 1, cwd.length);

/**
 * Merge default and given options
 * @param options
 */
const getOptions = (options: DockerPushOptions) => {
  // prettier-ignore
  const { t = "", tag = "", tags = [], ..._rest } = options;

  const allTags = [...(tag ? [tag] : []), ...(t ? [t] : []), ...tags];

  return {
    tags: allTags,
    rest: _rest
  };
};

/**
 * Docker build wrapper with default tag and NPM_TOKEN build-arg
 * @param options
 * @param launchOptions
 */
export async function dockerPush(
  options: DockerPushOptions = {},
  launchOptions = {}
) {
  let { tags, rest } = getOptions(options);
  if (!tags || tags.length === 0) {
    const { USER } = process.env;
    tags = [`${edgeFolderName}.${USER}.dev:${Date.now()}`];
  }
  /**
   * Build docker image
   */
  // prettier-ignore
  const promises = tags.map((tag) => {
    return launch({
      cmds: ["docker", "push", tag, ...spreadArgs(rest)],
      ...launchOptions
    });
  })
  return await Promise.all(promises);
}
