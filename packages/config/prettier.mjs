import * as tailwindcss from 'prettier-plugin-tailwindcss';

/**
 * Shared Prettier config (docs/code-style.md section 5).
 * @type {import('prettier').Config}
 */
const config = {
  printWidth: 100,
  singleQuote: true,
  semi: true,
  trailingComma: 'all',
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf',
  plugins: [tailwindcss],
  tailwindFunctions: ['cva', 'cn'],
};

export default config;
