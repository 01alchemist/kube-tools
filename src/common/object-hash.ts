import * as crypto from "crypto";

export function objectHash(obj: any) {
  if (typeof obj === "object") {
    if (Array.isArray(obj)) {
      return arrayHash(obj);
    } else {
      const keys = Object.keys(obj).sort();
      const sortedHashMap: [string, string][] = keys.map(key => [
        key,
        objectHash(obj[key])
      ]);
      return crypto
        .createHash("md5")
        .update(JSON.stringify(sortedHashMap))
        .digest("hex");
    }
  }
  return crypto
    .createHash("md5")
    .update(JSON.stringify(obj))
    .digest("hex");
}
export function arrayHash(array: any[]) {
  const sortedHashMap = array.forEach(item => objectHash(item));
  return crypto
    .createHash("md5")
    .update(JSON.stringify(sortedHashMap))
    .digest("hex");
}
