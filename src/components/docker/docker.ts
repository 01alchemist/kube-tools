import { ArgMap } from "common/types";
import { spreadArgs } from "./docker-args";
import { launch } from "@01/launcher";
import { dockerBuild } from "./docker-build";
const minimist = require("minimist");

export async function docker(
  cmd: string,
  options: ArgMap | string | string[] = {},
  launchOptions = {}
) {
  let _options = <ArgMap>options;

  if (typeof options === "string") {
    _options = minimist([options]);
  }
  if (Array.isArray(options)) {
    _options = minimist(options);
  }

  if (cmd === "build") {
    return await dockerBuild(_options, launchOptions);
  } else {
    return await launch({
      cmds: ["docker", cmd, ...spreadArgs(_options)],
      ...launchOptions
    });
  }
}
