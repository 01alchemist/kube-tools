import { launch } from "@01/launcher";
import { ArgMap } from "~/common/types";

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
  const {
    t = "", tag = "", tags = []
  } = options;

  const allTags = [...(tag ? [tag] : []), ...(t ? [t] : []), ...tags];

  return {
    tags: allTags
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
  let { tags } = getOptions(options);
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
      cmds: [
        "docker", "push", tag
      ],
      ...launchOptions
    })
  })
  return await Promise.all(promises);
}
