type MergeOptions = {
  skipDuplicates: boolean;
};
const defaultOptions = {
  skipDuplicates: false
};
export function mergeObjects(
  object1: any,
  object2: any,
  options: MergeOptions = defaultOptions
): any {
  if (object1 && object2) {
    if (Array.isArray(object1) && Array.isArray(object2)) {
      let result = [...object1, ...object2];
      if (options.skipDuplicates) {
        result = Array.from(new Set(result));
      }
      return result;
    }
    const result: any = {};
    const keys2 = Object.keys(object2);
    Object.keys(object1).forEach((key1: string) => {
      const obj1 = object1[key1];
      const key2index = keys2.indexOf(key1);
      if (key2index > -1) {
        const [key2] = keys2.splice(key2index, 1);
        const obj2 = object2[key2];
        if (typeof obj2 === "object") {
          const mergedObj = mergeObjects(obj1, obj2, options);
          result[key1] = mergedObj;
        } else {
          result[key1] = obj2;
        }
      } else {
        result[key1] = obj1;
      }
    });
    keys2.forEach(key2 => {
      result[key2] = object2[key2];
    });
    return result;
  }
  return object1 || object2 || {};
}
