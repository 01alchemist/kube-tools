import { mergeObjects } from "./merge-obj";

describe("Merge object test suite", () => {
  test("Array merge test", () => {
    const a = [1, 2];
    const b = [3, 4];
    expect(mergeObjects(a, b)).toEqual([1, 2, 3, 4]);
  });
  test("Property array merge test", () => {
    const a = { array: [1, 2] };
    const b = { array: [3, 4] };
    expect(mergeObjects(a, b)).toEqual({ array: [1, 2, 3, 4] });
  });
});
