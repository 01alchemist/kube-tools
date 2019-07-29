import { readYamlSync } from "sls-yaml";
import * as _path from "path";

export function loadConfig(path: string) {
  try {
    const basePath = path.substring(0, path.lastIndexOf("/"));
    const doc = readYamlSync(path);
    const values = readYamlSync(_path.resolve(basePath, doc.app.values));
    doc.values = values;
    doc.basePath = basePath;
    return doc;
  } catch (e) {
    console.log(e);
  }
}
