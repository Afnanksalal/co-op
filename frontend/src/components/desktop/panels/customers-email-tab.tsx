import { useState } from 'react';
import { EnvelopeSimple, PencilSimple } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  sendSingleCampaignEmail,
  updateCampaignEmail,
  type CampaignEmail,
  type DesktopState,
} from '@/lib/desktop/runtime';
import { emailStatusLabels } from '../constants';
import { EmptyState, PanelTitle } from '../shared';

export function EmailDraftsTab({
  emails,
  busyAction,
  runWithState,
}: {
  emails: CampaignEmail[];
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  function startEditing(email: CampaignEmail) {
    setEditingId(email.id);
    setEditSubject(email.subject);
    setEditBody(email.body);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditSubject('');
    setEditBody('');
  }

  return (
    <section className="rounded-lg border border-border/50 bg-card p-5">
      <PanelTitle icon={EnvelopeSimple} title="Email drafts" />
      <div className="grid gap-3">
        {emails.map((item) => {
          const isEditing = editingId === item.id;
          const isDraft = item.status === 'generated';
          const statusLabel = emailStatusLabels[item.status] ?? item.status;

          return (
            <article
              key={item.id}
              className="rounded-lg border border-border/50 bg-background p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                    />
                  ) : (
                    <h3 className="truncate font-medium">{item.subject}</h3>
                  )}
                  <p className="mt-1 break-all text-sm text-muted-foreground">{item.to}</p>
                </div>
                <Badge
                  variant={
                    item.status === 'sent'
                      ? 'success'
                      : item.status === 'failed'
                        ? 'destructive'
                        : item.status === 'dry_run_ok'
                          ? 'secondary'
                          : 'outline'
                  }
                >
                  {statusLabel}
                </Badge>
              </div>
              {isEditing ? (
                <textarea
                  className="coop-scrollbar mt-3 w-full rounded-md border border-border bg-background p-3 font-sans text-sm leading-6"
                  rows={8}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                />
              ) : (
                <pre className="coop-scrollbar mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 font-sans text-sm leading-6">
                  {item.body}
                </pre>
              )}
              {item.providerMessage && (
                <p className="mt-3 text-xs text-muted-foreground">{item.providerMessage}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {isDraft && !isEditing && (
                  <Button size="sm" variant="ghost" onClick={() => startEditing(item)}>
                    <PencilSimple className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
                {isEditing && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyAction === 'edit-email'}
                      onClick={() => {
                        void runWithState(
                          'edit-email',
                          () => updateCampaignEmail(item.id, editSubject, editBody),
                          'Draft updated.'
                        ).then(() => cancelEditing());
                      }}
                    >
                      Save edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEditing}>
                      Cancel
                    </Button>
                  </>
                )}
                {(isDraft || item.status === 'dry_run_ok') && !isEditing && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyAction === 'send-one'}
                      onClick={() =>
                        void runWithState(
                          'send-one',
                          () => sendSingleCampaignEmail(item.id, false),
                          'Email sent.'
                        )
                      }
                    >
                      Send
                    </Button>
                    {item.status !== 'dry_run_ok' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyAction === 'dry-run'}
                        onClick={() =>
                          void runWithState(
                            'dry-run',
                            () => sendSingleCampaignEmail(item.id, true),
                            'Dry run passed.'
                          )
                        }
                      >
                        Dry run
                      </Button>
                    )}
                  </>
                )}
              </div>
            </article>
          );
        })}
        {emails.length === 0 && (
          <EmptyState
            icon={EnvelopeSimple}
            title="No email drafts"
            text="Create an outreach plan and draft emails from the Outreach plans tab. Prospects need email addresses before drafts can be generated."
          />
        )}
      </div>
    </section>
  );
}
