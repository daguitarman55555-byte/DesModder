/**
 * @type {import('@jest/types').Config.ProjectConfig}
 */
module.exports = {
  preset: "ts-jest",
  rootDir: "../",
  coverageReporters: ["html", "lcov", "text"],
  coverageDirectory: "<rootDir>/coverage",
  transform: {
    "^.+\\.[tj]s": [
      "ts-jest",
      {
        tsconfig: {
          moduleResolution: "node",
          module: "es6",
          allowJs: true,
        },
        isolatedModules: true,
      },
    ],
    "\\.grammar": "<rootDir>/jest-config/lezer-transformer.mjs",
    "\\.replacements": "<rootDir>/jest-config/replacements-transformer.mjs",
  },
  // `.claude/` holds whole checkouts of this repository (agent worktrees).
  // Left unignored, Jest ran every one of their tests as well as ours — more
  // than twice the suites, against stale code — and its module map saw two
  // packages named @desmodder/text-mode-core.
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.claude/",
    "dist",
    "dist-ts",
  ],
  modulePathIgnorePatterns: ["<rootDir>/.claude/"],
  moduleDirectories: ["node_modules", "src"],
  transformIgnorePatterns: [
    "setup-unit",
    // The following packages are ESM, and unit tests need them to be transformed.
    "node_modules/(?!ansi-regex|string-length|strip-ansi|get-east-asian-width|emoji-regex|string-width)",
  ],
  moduleNameMapper: {
    "^#metadata/(.*)$": "<rootDir>/metadata/$1",
    ".ftl$": "<rootDir>/localization/mock-ftl.ts",
  },
};
