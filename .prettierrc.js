/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */

const config = {
  semi: false,
  bracketSpacing: true,
  bracketSameLine: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 96,
  tabWidth: 2,
  plugins: ['prettier-plugin-tailwindcss'],
}

export default config
