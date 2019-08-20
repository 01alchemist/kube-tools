import { readYamlSync } from "sls-yaml";
import * as _path from "path";

export function loadConfig(path: string) {
  try {
    const basePath = path.substring(0, path.lastIndexOf("/"));
    const doc = readYamlSync(path);
    const valuesSource = doc.app.helm.values.source;
    if (valuesSource && Array.isArray(valuesSource)) {
      const values = valuesSource.reduce((acc, item) => {
        acc = {
          ...acc,
          ...item
        };
        return acc;
      }, {});
      delete doc.values;
      delete doc.app.values;
      doc.app.helm.values.source = values;
    }
    doc.basePath = basePath;
    return doc;
  } catch (e) {
    console.log(e);
  }
}
