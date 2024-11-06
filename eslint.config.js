import createConfig from '@elsikora/eslint-config';

export default [
  {
    ignores: [
  "**/node_modules/",
  "**/.git/",
  "**/dist/",
  "**/build/",
  "**/coverage/",
  "**/.vscode/",
  "**/.idea/",
  "**/*.min.js",
  "**/*.bundle.js"
]
  },
  ...createConfig({
    javascript: true,
    typescript: true,
    prettier: true,
    stylistic: true,
    sonar: true,
    unicorn: true,
    perfectionist: true,
    json: true,
    yaml: true,
    checkFile: true,
    packageJson: true,
    node: true,
    regexp: true
  })
];
