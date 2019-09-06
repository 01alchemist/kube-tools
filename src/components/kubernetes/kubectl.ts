import { launch } from "@01/launcher";

export async function kubectl(args: string[], launchOptions = {}) {
  return await launch({
    cmds: ["kubectl", ...args],
    stdio: "pipe",
    ...launchOptions
  });
}
