/**
 * Proves the boundary rules of M0-14 fire: each case lints a snippet as if it were the content
 * of a real file in the repo, so the path-based rules and typed linting both apply.
 */
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';

const repoRoot = resolve(fileURLToPath(import.meta.url), '../..');

const FILES = {
  adminFeature: 'apps/admin/src/features/home/home-page.tsx',
  adminShared: 'apps/admin/src/shared-components/settings-bar.tsx',
  posFeature: 'apps/pos/src/features/home/home-page.tsx',
  api: 'apps/api/src/modules/health/health.service.ts',
  uiWeb: 'packages/ui-web/src/components/card.tsx',
  uiPos: 'packages/ui-pos/src/components/card.tsx',
  contract: 'packages/contract/src/locale.ts',
  utils: 'packages/utils/src/money.ts',
  designTokens: 'packages/design-tokens/src/contrast.ts',
  i18n: 'packages/i18n/src/localize.ts',
};

/** @type {ESLint} */
let eslint;

before(() => {
  eslint = new ESLint({ cwd: repoRoot });
});

/**
 * Lints `code` as the content of `file` and returns the ids of the rules that reported.
 * @param {keyof typeof FILES} file
 * @param {string} code
 */
async function ruleIds(file, code) {
  const [result] = await eslint.lintText(code, { filePath: resolve(repoRoot, FILES[file]) });
  return new Set((result?.messages ?? []).map((message) => message.ruleId));
}

/** @param {keyof typeof FILES} file @param {string} code @param {string} rule */
async function assertReports(file, code, rule) {
  const ids = await ruleIds(file, code);
  assert.ok(ids.has(rule), `expected ${rule} in ${FILES[file]}, got: ${[...ids].join(', ')}`);
}

/** @param {keyof typeof FILES} file @param {string} code @param {string} rule */
async function assertAllows(file, code, rule) {
  const ids = await ruleIds(file, code);
  assert.ok(!ids.has(rule), `did not expect ${rule} in ${FILES[file]}`);
}

describe('raw UI libraries stay inside packages/ui-*', () => {
  it('blocks them in an app', async () => {
    await assertReports(
      'adminFeature',
      "import { Dialog } from 'radix-ui';\nexport { Dialog };\n",
      'no-restricted-imports',
    );
    await assertReports(
      'posFeature',
      "import { Check } from 'lucide-react';\nexport { Check };\n",
      'no-restricted-imports',
    );
    await assertReports(
      'adminShared',
      "import * as Dialog from '@radix-ui/react-dialog';\nexport { Dialog };\n",
      'no-restricted-imports',
    );
  });

  it('allows them in the platform package', async () => {
    await assertAllows(
      'uiWeb',
      "import { Dialog } from 'radix-ui';\nexport { Dialog };\n",
      'no-restricted-imports',
    );
  });
});

describe('an app uses only the component set of its platform', () => {
  it('blocks the other platform', async () => {
    await assertReports(
      'adminFeature',
      "import { Button } from '@fnb/ui-pos';\nexport { Button };\n",
      'no-restricted-imports',
    );
    await assertReports(
      'posFeature',
      "import { Button } from '@fnb/ui-web';\nexport { Button };\n",
      'no-restricted-imports',
    );
  });

  it('allows its own platform', async () => {
    await assertAllows(
      'adminFeature',
      "import { Button } from '@fnb/ui-web';\nexport { Button };\n",
      'no-restricted-imports',
    );
    await assertAllows(
      'posFeature',
      "import { Button } from '@fnb/ui-pos';\nexport { Button };\n",
      'no-restricted-imports',
    );
  });
});

describe('apps do not import from other apps', () => {
  it('blocks a package-name import', async () => {
    await assertReports(
      'adminFeature',
      "import { something } from '@fnb/pos';\nexport { something };\n",
      'no-restricted-imports',
    );
  });

  it('blocks a relative import into another app', async () => {
    await assertReports(
      'adminFeature',
      "import { changeLocale } from '../../../../pos/src/lib/i18n';\nexport { changeLocale };\n",
      'import-x/no-restricted-paths',
    );
  });

  it('allows a relative import inside the same app', async () => {
    await assertAllows(
      'adminFeature',
      "import { changeLocale } from '../../lib/i18n';\nexport { changeLocale };\n",
      'import-x/no-restricted-paths',
    );
  });
});

describe('shared-components stay free of features and API code', () => {
  it('blocks features and the API client', async () => {
    await assertReports(
      'adminShared',
      "import { HomePage } from '../features/home/home-page';\nexport { HomePage };\n",
      'no-restricted-imports',
    );
    await assertReports(
      'adminShared',
      "import { client } from '@fnb/api-client';\nexport { client };\n",
      'no-restricted-imports',
    );
    await assertReports(
      'adminShared',
      "import { Button } from '@fnb/ui-pos';\nexport { Button };\n",
      'no-restricted-imports',
    );
  });
});

describe('package dependency direction', () => {
  it('keeps platform sets apart and free of API and business logic', async () => {
    await assertReports(
      'uiWeb',
      "import { Button } from '@fnb/ui-pos';\nexport { Button };\n",
      'no-restricted-imports',
    );
    await assertReports(
      'uiPos',
      "import { Button } from '@fnb/ui-web';\nexport { Button };\n",
      'no-restricted-imports',
    );
    await assertReports(
      'uiWeb',
      "import { client } from '@fnb/api-client';\nexport { client };\n",
      'no-restricted-imports',
    );
    await assertReports(
      'uiPos',
      "import { totals } from '@fnb/pos-core';\nexport { totals };\n",
      'no-restricted-imports',
    );
  });

  it('keeps the leaf packages free of workspace and React imports', async () => {
    await assertReports(
      'contract',
      "import { sumVnd } from '@fnb/utils';\nexport { sumVnd };\n",
      'no-restricted-imports',
    );
    await assertReports(
      'utils',
      "import { localeSchema } from '@fnb/contract';\nexport { localeSchema };\n",
      'no-restricted-imports',
    );
    await assertReports(
      'designTokens',
      "import { useState } from 'react';\nexport { useState };\n",
      'no-restricted-imports',
    );
    await assertReports(
      'i18n',
      "import { initReactI18next } from 'react-i18next';\nexport { initReactI18next };\n",
      'no-restricted-imports',
    );
    await assertAllows(
      'i18n',
      "import { localeSchema } from '@fnb/contract';\nexport { localeSchema };\n",
      'no-restricted-imports',
    );
  });

  it('keeps UI and the client out of the API', async () => {
    await assertReports(
      'api',
      "import { themes } from '@fnb/design-tokens';\nexport { themes };\n",
      'no-restricted-imports',
    );
    await assertReports(
      'api',
      "import { Button } from '@fnb/ui-web';\nexport { Button };\n",
      'no-restricted-imports',
    );
    await assertAllows(
      'api',
      "import { healthResponseSchema } from '@fnb/contract';\nexport { healthResponseSchema };\n",
      'no-restricted-imports',
    );
  });

  it('keeps packages from importing apps', async () => {
    await assertReports(
      'uiWeb',
      "import { something } from '@fnb/admin';\nexport { something };\n",
      'no-restricted-imports',
    );
  });
});

describe('UI code uses tokens only', () => {
  it('blocks hard-coded colors', async () => {
    await assertReports(
      'adminFeature',
      'export const className = "text-[#333]";\n',
      'no-restricted-syntax',
    );
    await assertReports('uiWeb', "export const color = '#CA0404';\n", 'no-restricted-syntax');
    await assertReports('uiPos', "export const color = 'rgb(202 4 4)';\n", 'no-restricted-syntax');
    await assertReports(
      'posFeature',
      'const size = 2;\nexport const value = `border-${size} #fff`;\n',
      'no-restricted-syntax',
    );
  });

  it('blocks arbitrary Tailwind values', async () => {
    await assertReports(
      'adminFeature',
      'export const className = "w-[137px] p-4";\n',
      'no-restricted-syntax',
    );
    await assertReports(
      'uiWeb',
      'export const className = "flex md:max-w-[40rem]";\n',
      'no-restricted-syntax',
    );
  });

  it('blocks inline style', async () => {
    await assertReports(
      'adminFeature',
      'export const Box = () => <div style={{ width: 137 }} />;\n',
      'no-restricted-syntax',
    );
  });

  it('allows token classes, state variants and variable references', async () => {
    const allowed = [
      'bg-primary text-primary-fg h-control rounded-control',
      'data-[state=open]:bg-bg aria-[invalid=true]:border-danger',
      'w-(--radix-popover-trigger-width) max-h-(--radix-select-content-available-height)',
      '[&>svg]:size-icon-sm group-data-[state=on]:font-semibold',
    ];
    for (const classes of allowed) {
      await assertAllows(
        'uiWeb',
        `export const className = '${classes}';\n`,
        'no-restricted-syntax',
      );
    }
  });

  it('does not apply to non-UI packages', async () => {
    await assertAllows('designTokens', "export const color = '#CA0404';\n", 'no-restricted-syntax');
  });
});

describe('display strings go through i18n', () => {
  it('blocks literal text in JSX in apps and component packages', async () => {
    await assertReports(
      'adminFeature',
      'export const Title = () => <h1>Danh sách món</h1>;\n',
      'i18next/no-literal-string',
    );
    await assertReports(
      'uiPos',
      'export const Label = () => <span>Retry</span>;\n',
      'i18next/no-literal-string',
    );
  });

  it('allows translated text', async () => {
    await assertAllows(
      'adminFeature',
      "import { useTranslation } from 'react-i18next';\nexport const Title = () => {\n  const { t } = useTranslation('common');\n  return <h1>{t('app.admin')}</h1>;\n};\n",
      'i18next/no-literal-string',
    );
  });
});
