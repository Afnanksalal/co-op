import { EnvelopeSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  generateCampaignEmails,
  sendCampaignEmails,
  type Campaign,
  type DesktopState,
  type Lead,
} from '@/lib/desktop/runtime';
import { campaignStatusLabels, optionLabels } from '../constants';
import { PanelTitle } from '../shared';
import { looksLikeEmail } from '../utils';

export function CampaignList({
  campaigns,
  leads,
  busyAction,
  runWithState,
}: {
  campaigns: Campaign[];
  leads: Lead[];
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 xl:sticky xl:top-14">
      <PanelTitle icon={EnvelopeSimple} title="Outreach plans" />
      <div className="grid gap-3">
        {campaigns.map((campaign) => {
          const emailableLeads = leads.filter(
            (l) =>
              l.leadType === campaign.targetLeadType &&
              l.email.trim() &&
              looksLikeEmail(l.email)
          );
          const hasEmailableLeads = emailableLeads.length > 0;
          const statusLabel = campaignStatusLabels[campaign.status] ?? campaign.status;
          const modeLabel = optionLabels[campaign.mode] ?? campaign.mode;
          const hasDrafts =
            campaign.status === 'emails_generated' ||
            campaign.status === 'partially_sent' ||
            campaign.status === 'send_failed';

          return (
            <article
              key={campaign.id}
              className="rounded-md border border-border bg-background p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium">{campaign.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {modeLabel} · {statusLabel}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyAction === 'generate' || !hasEmailableLeads}
                      onClick={() =>
                        void runWithState(
                          'generate',
                          () => generateCampaignEmails({ campaignId: campaign.id }),
                          'Email drafts generated.'
                        )
                      }
                    >
                      Draft emails
                    </Button>
                    {hasDrafts && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyAction === 'send'}
                        onClick={() =>
                          void runWithState(
                            'send',
                            () => sendCampaignEmails({ campaignId: campaign.id }),
                            'Emails sent.'
                          )
                        }
                      >
                        Send all
                      </Button>
                    )}
                  </div>
                  {!hasEmailableLeads && (
                    <p className="text-xs text-muted-foreground">
                      No {campaign.targetLeadType} prospects have email addresses yet
                    </p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
