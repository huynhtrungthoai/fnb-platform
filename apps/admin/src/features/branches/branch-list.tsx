import { useTranslation } from 'react-i18next';

import { Badge, Card } from '@fnb/ui-web';

import type { Branch } from '@fnb/contract';

export interface BranchListProps {
  branches: readonly Branch[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Left column of the branch screen: every branch the user may see, with its status. */
export function BranchList({ branches, selectedId, onSelect }: BranchListProps) {
  const { t } = useTranslation('branches');
  return (
    <Card padding="none">
      <ul aria-label={t('listLabel')} className="divide-border flex flex-col divide-y">
        {branches.map((branch) => {
          const isSelected = branch.id === selectedId;
          return (
            <li key={branch.id}>
              <button
                type="button"
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => {
                  onSelect(branch.id);
                }}
                className={`focus-visible:outline-ring flex w-full flex-col gap-1 px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 ${isSelected ? 'bg-primary-subtle' : 'hover:bg-bg-muted'}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-text font-semibold">{branch.name}</span>
                  {branch.isActive ? (
                    <Badge tone="success" icon="check">
                      {t('status.active')}
                    </Badge>
                  ) : (
                    <Badge icon="ban">{t('status.inactive')}</Badge>
                  )}
                </span>
                {branch.address ? (
                  <span className="text-text-muted text-sm">{branch.address}</span>
                ) : null}
                <span className="text-text-subtle text-xs">{branch.code}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
