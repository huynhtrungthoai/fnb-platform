import { useTranslation } from 'react-i18next';

import { formatDateTime, resolveLocale } from '@fnb/i18n';
import { Badge, Dialog } from '@fnb/ui-web';

import { diffFields, isAuditAction } from './audit-format';

import type { AuditLog } from '@fnb/contract';

export interface AuditDetailDialogProps {
  row: AuditLog | null;
  onClose: () => void;
}

/** One event with its before/after fields (CORE-40). */
export function AuditDetailDialog({ row, onClose }: AuditDetailDialogProps) {
  const { t, i18n } = useTranslation('audit');
  const locale = resolveLocale(i18n.language);
  const changes = row ? diffFields(row) : [];
  const action = row?.action ?? '';
  const facts = [
    row ? formatDateTime(row.occurredAt, locale) : '',
    row?.actorName ?? (row?.actorUserId ? t('unknownActor') : t('system')),
    row?.ip ? t('detail.ip', { ip: row.ip }) : '',
  ].filter((part) => part.length > 0);

  return (
    <Dialog
      open={row !== null}
      onClose={onClose}
      title={isAuditAction(action) ? t(`actions.${action}`) : action}
      description={facts.join(' · ')}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        <Badge icon="scroll-text">{action}</Badge>
        {changes.length > 0 ? (
          <div className="border-border overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-bg-subtle text-text-muted text-left text-xs">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    {t('detail.field')}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {t('detail.before')}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {t('detail.after')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {changes.map((change) => (
                  <tr key={change.field} className="border-border border-t align-top">
                    <td className="px-3 py-2 font-mono text-xs">{change.field}</td>
                    <td className="text-danger-text px-3 py-2 font-mono text-xs break-all">
                      {change.before}
                    </td>
                    <td className="text-success-text px-3 py-2 font-mono text-xs break-all">
                      {change.after}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-text-muted text-sm">{t('detail.noChanges')}</p>
        )}
        {row?.metadata && Object.keys(row.metadata).length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="text-text text-sm font-semibold">{t('detail.metadata')}</p>
            <pre className="bg-bg-subtle rounded-control overflow-x-auto p-3 text-xs">
              {JSON.stringify(row.metadata, null, 2)}
            </pre>
          </div>
        ) : null}
        {row ? (
          <p className="text-text-subtle text-xs">
            {t('detail.request', { id: row.id, requestId: row.requestId ?? '—' })}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
