import type { JestConfigWithTsJest } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["./packages/"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true
      }
    ]
  },
  fakeTimers: {},
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    uuid: require.resolve("uuid"),
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  transformIgnorePatterns: ["dns"],
  testRegex: [
    "/__tests__/[A-Za-z0-9-/]+(\\.integration)?\\.(test|spec)\\.ts$",
    "/test/[A-Za-z0-9-/]+(\\.integration)?\\.(test|spec)\\.ts$"
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testTimeout: 60000,
  setupFilesAfterEnv: ["jest-extended/all"]
};
export default jestConfig;
