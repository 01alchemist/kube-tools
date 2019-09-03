import { readYamlSync } from "sls-yaml";
import get from "lodash.get";
import * as _path from "path";
import { mergeObjects } from "./components/obj/merge-obj";

export function loadConfig(path: string, overrideValues: any = {}) {
  try {
    const basePath = path.substring(0, path.lastIndexOf("/"));
    console.log(path);
    let values: any;
    const doc = readYamlSync(path, null, {
      merge: ([obj1, obj2]: any) => mergeObjects(obj1, obj2),
      values: ([key]: string[], { globalObj }: any) => {
        if (!values) {
          values = mergeObjects(globalObj.app.service.values, overrideValues);
        }
        return get(values, key);
      }
    });

    if (doc.app.service) {
      // Merge service values
      const valuesSource = doc.app.service.values;
      if (valuesSource && Array.isArray(valuesSource)) {
        const values = valuesSource.reduce((acc, item) => {
          if (item) {
            acc = mergeObjects(acc, item);
          }
          return acc;
        }, {});
        delete doc.values;
        delete doc.app.values;
        doc.app.service.values = values;
      }
    }

    if (doc.app.helm) {
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
    }

    doc.basePath = basePath;
    return doc;
  } catch (e) {
    console.error(e);
  }
}
