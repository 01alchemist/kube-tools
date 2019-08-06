import { ArgMap } from "common/types";

/**
 * Spread args object to command line arguments
 * @param args
 */
export function spreadArgs(args: ArgMap, prefix: string = "--") {
  const resultArgs: string[] = [];
  Object.keys(args).forEach(name => {
    const value: string | string[] = args[name];
    const argName = name.startsWith(prefix) ? name : prefix + name;
    const emptyName = prefix + "_";
    if (Array.isArray(value)) {
      value.forEach(_value => {
        if (argName !== emptyName) resultArgs.push(argName);
        if (_value !== "") resultArgs.push(_value);
      });
    } else {
      if (argName !== emptyName) resultArgs.push(argName);
      if (value !== "") resultArgs.push(value);
    }
  });
  return resultArgs.filter(arg => arg);
}
