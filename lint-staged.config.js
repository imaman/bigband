module.exports = {
  'modules/**/*.{js,ts,json,d.ts}': ['eslint --max-warnings 0 --fix', 'git add'],
  'package.json': ['yarn sort-package-json'],
  'modules/**/package.json': ['yarn sort-package-json'],
}
