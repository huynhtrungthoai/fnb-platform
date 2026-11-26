/**
 * Boundary rules (M0-14): who may import what, and what UI code may not contain.
 * Source of truth: plans/02-repo-setup.md section 2 and plans/03-design-system.md section 7.4.
 *
 * `no-restricted-imports` is replaced, not merged, when two config objects match the same file.
 * Each group below therefore lists everything that applies to its files, and more specific
 * groups (for example `shared-components`) come after the general ones.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Web apps and the component platform each one belongs to. Add an app here when it is created. */
const APP_PLATFORMS = {
  admin: 'web',
  'customer-web': 'web',
  pos: 'pos',
  'customer-app': 'mobile',
  'zalo-mini-app': 'mobile',
};

const PLATFORMS = ['web', 'pos', 'mobile'];

/** Raw UI libraries: only `packages/ui-*` may import them. */
const RAW_UI_LIBRARIES = [
  'radix-ui',
  '@radix-ui/*',
  'lucide-react',
  'lucide-react-native',
  'class-variance-authority',
  'cmdk',
  'vaul',
  'sonner',
  '@headlessui/*',
  'zmp-ui',
];

const RAW_UI_MESSAGE =
  'Raw UI libraries are imported only inside packages/ui-*. Use the component from @fnb/ui-<platform>, or add it there.';

/** @param {string} name */
const withSubpaths = (name) => [name, `${name}/*`];

/** Other apps, by package name. Relative cross-app imports are caught by `import-x/no-restricted-paths`. */
const ALL_APP_PACKAGES = ['@fnb/api', ...Object.keys(APP_PLATFORMS).map((app) => `@fnb/${app}`)];

/**
 * @param {{ group: string[], message: string }[]} patterns
 * @returns {import('eslint').Linter.RuleEntry}
 */
const restrictedImports = (patterns) => ['error', { patterns }];

/** @param {string} app */
function appPatterns(app) {
  const platform = APP_PLATFORMS[app];
  const otherPlatforms = PLATFORMS.filter((candidate) => candidate !== platform);
  return [
    { group: RAW_UI_LIBRARIES, message: RAW_UI_MESSAGE },
    {
      group: otherPlatforms.flatMap((other) => withSubpaths(`@fnb/ui-${other}`)),
      message: `apps/${app} belongs to the ${platform} platform and uses only @fnb/ui-${platform}.`,
    },
    {
      group: ALL_APP_PACKAGES.filter((name) => name !== `@fnb/${app}`).flatMap(withSubpaths),
      message: 'Apps do not import from other apps. Move shared code to a package.',
    },
  ];
}

const NO_APPS_FROM_PACKAGES = {
  group: ALL_APP_PACKAGES.flatMap(withSubpaths),
  message: 'Packages never import from apps.',
};

/** @param {string[]} names @param {string} message */
const forbid = (names, message) => ({ group: names.flatMap(withSubpaths), message });

const UI_PACKAGES = PLATFORMS.map((platform) => `@fnb/ui-${platform}`);
const REACT = ['react', 'react-dom', 'react-native'];

/** Import restrictions of each package, from the table in plans/02-repo-setup.md section 2. */
const PACKAGE_RESTRICTIONS = {
  contract: [
    { group: ['@fnb/*'], message: '@fnb/contract depends on zod only.' },
    forbid(REACT, '@fnb/contract holds schemas and types, no UI.'),
  ],
  utils: [
    { group: ['@fnb/*'], message: '@fnb/utils has no workspace dependencies.' },
    forbid(REACT, '@fnb/utils is framework-free.'),
  ],
  'design-tokens': [
    { group: ['@fnb/*'], message: '@fnb/design-tokens holds values only and imports nothing.' },
    forbid(REACT, '@fnb/design-tokens holds values only, no components.'),
  ],
  i18n: [
    forbid(
      [...UI_PACKAGES, '@fnb/api-client', '@fnb/design-tokens', '@fnb/pos-core'],
      '@fnb/i18n may import only @fnb/contract and @fnb/utils.',
    ),
    forbid(
      [...REACT, 'react-i18next'],
      '@fnb/i18n is used by the API too; apps pass initReactI18next as a plugin.',
    ),
  ],
  'pos-core': [
    forbid(
      [...UI_PACKAGES, '@fnb/api-client', '@fnb/design-tokens', '@fnb/i18n'],
      '@fnb/pos-core is pure logic and may import only @fnb/contract and @fnb/utils; it receives `t` as a parameter.',
    ),
    forbid(REACT, '@fnb/pos-core is pure TypeScript: no React, DOM or React Native.'),
  ],
  'api-client': [
    forbid(
      [...UI_PACKAGES, '@fnb/design-tokens'],
      '@fnb/api-client contains no UI and may import only @fnb/contract and @fnb/utils.',
    ),
  ],
};

for (const platform of PLATFORMS) {
  PACKAGE_RESTRICTIONS[`ui-${platform}`] = [
    forbid(
      ['@fnb/api-client', '@fnb/pos-core'],
      'Components do not call the API or contain business logic; data comes in through props.',
    ),
    forbid(
      UI_PACKAGES.filter((name) => name !== `@fnb/ui-${platform}`),
      'A platform component set never imports another platform. Build the component here under the same name.',
    ),
  ];
}

// The regular expressions below are embedded in esquery selectors, so they contain no `/`.
const HEX_COLOR = '#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b';
const COLOR_FUNCTION = '\\b(rgba?|hsla?|oklch|oklab)\\(';
// Flags `w-[137px]` and `text-[#333]`. A bracket followed by `:` is a state variant such as
// `data-[state=open]:` or `aria-[invalid=true]:` and is allowed, as are token references
// written with parentheses: `w-(--radix-popover-trigger-width)`.
const ARBITRARY_VALUE = '(^|[\\s:])-?[a-z][a-z0-9-]*-\\[[^\\]]+\\](?!:)';

const COLOR_MESSAGE =
  'No hard-coded colors. Use a token class such as bg-primary; add a token in packages/design-tokens/tokens.json if one is missing.';
const ARBITRARY_MESSAGE =
  'No arbitrary Tailwind values such as w-[137px]. Use a token; state variants (data-[state=open]:) and variable references (w-(--var)) are fine.';

/** @param {string} pattern @param {string} message */
const stringSelectors = (pattern, message) => [
  { selector: `Literal[value=/${pattern}/]`, message },
  { selector: `TemplateElement[value.raw=/${pattern}/]`, message },
];

const UI_SYNTAX_RESTRICTIONS = [
  ...stringSelectors(HEX_COLOR, COLOR_MESSAGE),
  ...stringSelectors(COLOR_FUNCTION, COLOR_MESSAGE),
  ...stringSelectors(ARBITRARY_VALUE, ARBITRARY_MESSAGE),
  {
    selector: 'JSXAttribute[name.name="style"]',
    message:
      'No inline style. Sizes, colors and spacing come from tokens through Tailwind classes.',
  },
];

/** @param {string} directory */
function listDirectories(directory) {
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * Builds the boundary config objects.
 * @param {{ rootDir: string, importX: import('eslint').ESLint.Plugin }} options
 * @returns {import('eslint').Linter.Config[]}
 */
export function createBoundaryConfigs({ rootDir, importX }) {
  const apps = listDirectories(join(rootDir, 'apps'));
  const uiApps = apps.filter((app) => app in APP_PLATFORMS);

  /** @type {import('eslint').Linter.Config[]} */
  const configs = [];

  // Packages: dependency direction between packages.
  for (const [name, patterns] of Object.entries(PACKAGE_RESTRICTIONS)) {
    configs.push({
      files: [`packages/${name}/**/*.{ts,tsx}`],
      rules: { 'no-restricted-imports': restrictedImports([...patterns, NO_APPS_FROM_PACKAGES]) },
    });
  }

  // API: no UI packages, no client.
  configs.push({
    files: ['apps/api/**/*.ts'],
    rules: {
      'no-restricted-imports': restrictedImports([
        forbid(
          [...UI_PACKAGES, '@fnb/design-tokens', '@fnb/api-client'],
          'apps/api may import only @fnb/contract, @fnb/utils, @fnb/i18n and @fnb/pos-core.',
        ),
        forbid(
          ALL_APP_PACKAGES.filter((name) => name !== '@fnb/api'),
          'Apps do not import from other apps.',
        ),
      ]),
    },
  });

  // UI apps: platform set only, no raw UI library, no other app.
  for (const app of uiApps) {
    const patterns = appPatterns(app);
    configs.push({
      files: [`apps/${app}/src/**/*.{ts,tsx}`],
      rules: { 'no-restricted-imports': restrictedImports(patterns) },
    });
    configs.push({
      files: [`apps/${app}/src/shared-components/**/*.{ts,tsx}`],
      rules: {
        'no-restricted-imports': restrictedImports([
          ...patterns,
          forbid(
            ['@fnb/api-client', '@fnb/pos-core'],
            'shared-components do not call the API or contain business logic.',
          ),
          {
            group: ['**/features/**'],
            message: 'shared-components do not depend on a feature; pass data through props.',
          },
        ]),
      },
    });
  }

  // Relative imports that reach into another app, and packages reaching into apps.
  configs.push({
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    plugins: { 'import-x': importX },
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          basePath: rootDir,
          zones: [
            ...apps.map((app) => ({
              target: `./apps/${app}`,
              from: './apps',
              except: [`./${app}`],
              message: 'Apps do not import from other apps. Move shared code to a package.',
            })),
            {
              target: './packages',
              from: './apps',
              message: 'Packages never import from apps.',
            },
          ],
        },
      ],
    },
  });

  // UI code: tokens only.
  configs.push({
    files: [
      ...uiApps.map((app) => `apps/${app}/src/**/*.{ts,tsx}`),
      'packages/ui-*/src/**/*.{ts,tsx}',
    ],
    ignores: ['**/*.test.{ts,tsx}', '**/test/**'],
    rules: { 'no-restricted-syntax': ['error', ...UI_SYNTAX_RESTRICTIONS] },
  });

  return configs;
}
