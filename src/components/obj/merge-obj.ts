export function mergeObjects(object1: any, object2: any): any {
  const result: any = {};
  const keys2 = Object.keys(object2);
  Object.keys(object1).forEach((key1: string) => {
    const obj1 = object1[key1];
    const key2index = keys2.indexOf(key1);
    if (key2index > -1) {
      const [key2] = keys2.splice(key2index, 1);
      const obj2 = object2[key2];
      if (typeof obj2 === "object" && !Array.isArray(obj2)) {
        const mergedObj = mergeObjects(obj1, obj2);
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
