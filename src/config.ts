import { readYamlSync } from "sls-yaml";
import * as _path from "path";
import { mergeObjects } from "./components/obj/merge-obj";

export function loadConfig(path: string) {
  try {
    const basePath = path.substring(0, path.lastIndexOf("/"));
    const doc = readYamlSync(path);

    // Merge helm values and chart
    const valuesSource = doc.app.helm.values;
    if (valuesSource && Array.isArray(valuesSource)) {
      const values = valuesSource.reduce((acc, item) => {
        if (item) {
          acc = mergeObjects(acc, item);
        }
        return acc;
      }, {});
      delete doc.values;
      delete doc.app.values;
      doc.app.helm.values = values;
    }

    const chartSource = doc.app.helm.chart;
    if (chartSource && Array.isArray(chartSource)) {
      const chart = chartSource.reduce((acc, item) => {
        if (item) {
          acc = mergeObjects(acc, item);
        }
        return acc;
      }, {});
      doc.app.helm.chart = chart;
    }

    doc.basePath = basePath;
    return doc;
  } catch (e) {
    console.error(e);
  }
}
