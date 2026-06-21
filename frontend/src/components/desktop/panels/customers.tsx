'use client';

import { useState } from 'react';
import { EnvelopeSimple, Sparkle, UsersThree } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  createCampaign,
  createLead,
  discoverLeads,
  generateCampaignEmails,
  sendCampaignEmails,
  type Campaign,
  type DesktopState,
} from '@/lib/desktop/runtime';
import { blankCampaign, blankLead, optionLabels } from '../constants';
import { EmptyState, Field, PanelTitle, SegmentedControl, SelectField, TextArea } from '../shared';
import { leadName } from '../utils';

export function OutreachPanel({
  state,
  busyAction,
  runWithState,
}: {
  state: DesktopState;
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
}) {
  const [activeTab, setActiveTab] = useState('leads');
  const [discovery, setDiscovery] = useState({ query: '', leadType: 'company', maxLeads: 5 });
  const [lead, setLead] = useState(blankLead);
  const [campaign, setCampaign] = useState(blankCampaign);
  const webSearchReady =
    state.modelSettings.researchProvider === 'firecrawl' &&
    state.modelSettings.firecrawlApiKeySaved;
  const tabs = [
    { id: 'leads', label: `Prospects (${state.leads.length})` },
    { id: 'campaigns', label: `Outreach plans (${state.campaigns.length})` },
    { id: 'emails', label: `Email drafts (${state.campaignEmails.length})` },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <SegmentedControl value={activeTab} onChange={setActiveTab} options={tabs} />

      {activeTab === 'leads' && (
        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-5 overflow-hidden xl:grid-cols-[420px_minmax(0,1fr)] xl:grid-rows-1">
          <div className="coop-scrollbar max-h-80 space-y-5 overflow-y-auto pr-1 xl:max-h-none">
            <form
              className="rounded-lg border border-border/50 bg-card p-5"
              onSubmit={(event) => {
                event.preventDefault();
                void runWithState('discover', () => discoverLeads(discovery), 'Prospects found.');
              }}
            >
              <PanelTitle icon={Sparkle} title="Find prospects" />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background p-3">
                <p className="text-sm leading-6 text-muted-foreground">
                  Searches the web for matching people or companies, then saves results locally.
                </p>
                <Badge variant={webSearchReady ? 'secondary' : 'outline'}>
                  {webSearchReady ? 'Ready' : 'Needs setup'}
                </Badge>
              </div>
              <TextArea
                label="Search brief"
                value={discovery.query}
                onChange={(query) => setDiscovery({ ...discovery, query })}
                minHeight="min-h-28"
                placeholder="Example: US finance leaders at B2B SaaS companies that need better reporting"
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Type"
                  value={discovery.leadType}
                  onChange={(leadType) => setDiscovery({ ...discovery, leadType })}
                  options={['company', 'person']}
                />
                <Field
                  label="Max leads"
                  type="number"
                  value={String(discovery.maxLeads)}
                  onChange={(maxLeads) => {
                    const parsed = Number(maxLeads);
                    setDiscovery({
                      ...discovery,
                      maxLeads: Number.isFinite(parsed) ? Math.max(1, Math.min(25, parsed)) : 5,
                    });
                  }}
                />
              </div>
              {!webSearchReady && (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Open Account, choose Settings, and save a web research key first.
                </p>
              )}
              <Button
                className="mt-5"
                type="submit"
                disabled={busyAction === 'discover' || !webSearchReady || !discovery.query.trim()}
              >
                Find prospects
              </Button>
            </form>
            <form
              className="rounded-lg border border-border/50 bg-card p-5"
              onSubmit={(event) => {
                event.preventDefault();
                void runWithState('lead', () => createLead(lead), 'Prospect saved.').then(() =>
                  setLead(blankLead)
                );
              }}
            >
              <PanelTitle icon={UsersThree} title="Add a prospect" />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Prospect type"
                  value={lead.leadType}
                  onChange={(leadType) => setLead({ ...lead, leadType })}
                  options={['company', 'person']}
                />
                <Field
                  label="Email"
                  value={lead.email}
                  onChange={(email) => setLead({ ...lead, email })}
                />
                <Field
                  label="Name"
                  value={lead.name}
                  onChange={(name) => setLead({ ...lead, name })}
                />
                <Field
                  label="Company"
                  value={lead.companyName}
                  onChange={(companyName) => setLead({ ...lead, companyName })}
                />
                <Field
                  label="Website"
                  value={lead.website}
                  onChange={(website) => setLead({ ...lead, website })}
                />
                <Field
                  label="Niche"
                  value={lead.niche}
                  onChange={(niche) => setLead({ ...lead, niche })}
                />
              </div>
              <Button className="mt-5" type="submit">
                Save prospect
              </Button>
            </form>
          </div>
          <section className="coop-scrollbar min-h-0 overflow-y-auto rounded-lg border border-border/50 bg-card p-5">
            <PanelTitle icon={UsersThree} title="Prospects" />
            <div className="grid gap-3">
              {state.leads.map((item) => (
                <article
                  key={item.id}
                  className="rounded-lg border border-border/50 bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium">{leadName(item)}</h3>
                      <p className="mt-1 break-all text-sm text-muted-foreground">
                        {item.email || item.website || item.profileUrl || 'No contact yet'}
                      </p>
                      <p className="mt-2 break-words text-xs text-muted-foreground">
                        {[item.platform, item.niche, item.location].filter(Boolean).join(' - ')}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant="outline">{item.status}</Badge>
                      <Badge variant={item.leadScore >= 70 ? 'success' : 'secondary'}>
                        {item.leadScore}% fit
                      </Badge>
                    </div>
                  </div>
                </article>
              ))}
              {state.leads.length === 0 && (
                <EmptyState
                  icon={UsersThree}
                  title="No prospects yet"
                  text="Find or add prospects locally, then turn them into outreach emails."
                />
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-5 overflow-hidden xl:grid-cols-[minmax(0,1fr)_420px] xl:grid-rows-1">
          <form
            className="coop-scrollbar max-h-80 overflow-y-auto rounded-lg border border-border/50 bg-card p-5 xl:max-h-none"
            onSubmit={(event) => {
              event.preventDefault();
              void runWithState(
                'campaign',
                () => createCampaign(campaign),
                'Outreach plan saved.'
              ).then(() => setCampaign(blankCampaign));
            }}
          >
            <PanelTitle icon={EnvelopeSimple} title="Outreach plan" />
            <div className="grid gap-4 lg:grid-cols-2">
              <Field
                label="Name"
                value={campaign.name}
                onChange={(name) => setCampaign({ ...campaign, name })}
              />
              <SelectField
                label="Draft style"
                value={campaign.mode}
                onChange={(mode) => setCampaign({ ...campaign, mode })}
                options={['ai_personalized', 'single_template']}
              />
              <SelectField
                label="Send to"
                value={campaign.targetLeadType}
                onChange={(targetLeadType) => setCampaign({ ...campaign, targetLeadType })}
                options={['company', 'person']}
              />
              <Field
                label="Tone"
                value={campaign.tone}
                onChange={(tone) => setCampaign({ ...campaign, tone })}
              />
              <Field
                label="Goal"
                value={campaign.campaignGoal}
                onChange={(campaignGoal) => setCampaign({ ...campaign, campaignGoal })}
              />
              <Field
                label="Call to action"
                value={campaign.callToAction}
                onChange={(callToAction) => setCampaign({ ...campaign, callToAction })}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <TextArea
                label="Subject template"
                value={campaign.subjectTemplate}
                onChange={(subjectTemplate) => setCampaign({ ...campaign, subjectTemplate })}
              />
              <TextArea
                label="Body template"
                value={campaign.bodyTemplate}
                onChange={(bodyTemplate) => setCampaign({ ...campaign, bodyTemplate })}
              />
            </div>
            <Button className="mt-5" type="submit">
              Create outreach plan
            </Button>
          </form>
          <CampaignList
            campaigns={state.campaigns}
            busyAction={busyAction}
            runWithState={runWithState}
          />
        </div>
      )}

      {activeTab === 'emails' && (
        <section className="coop-scrollbar min-h-0 flex-1 overflow-y-auto rounded-lg border border-border/50 bg-card p-5">
          <PanelTitle icon={EnvelopeSimple} title="Email drafts" />
          <div className="grid gap-3">
            {state.campaignEmails.map((item) => (
              <article
                key={item.id}
                className="rounded-lg border border-border/50 bg-background p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{item.subject}</h3>
                    <p className="mt-1 break-all text-sm text-muted-foreground">{item.to}</p>
                  </div>
                  <Badge
                    variant={
                      item.status === 'sent'
                        ? 'success'
                        : item.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
                <pre className="coop-scrollbar mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 font-sans text-sm leading-6">
                  {item.body}
                </pre>
                {item.providerMessage && (
                  <p className="mt-3 text-xs text-muted-foreground">{item.providerMessage}</p>
                )}
              </article>
            ))}
            {state.campaignEmails.length === 0 && (
              <EmptyState
                icon={EnvelopeSimple}
                title="No email drafts"
                text="Create an outreach plan, generate drafts, then send through the saved email service."
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function CampaignList({
  campaigns,
  busyAction,
  runWithState,
}: {
  campaigns: Campaign[];
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
}) {
  return (
    <section className="coop-scrollbar min-h-0 overflow-y-auto rounded-lg border border-border bg-card p-5">
      <PanelTitle icon={EnvelopeSimple} title="Outreach plans" />
      <div className="grid gap-3">
        {campaigns.map((campaign) => (
          <article key={campaign.id} className="rounded-md border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-medium">{campaign.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {campaign.mode} - {campaign.status}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyAction === 'generate'}
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
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyAction === 'send'}
                  onClick={() =>
                    void runWithState(
                      'send',
                      () => sendCampaignEmails({ campaignId: campaign.id }),
                      'Email send attempted.'
                    )
                  }
                >
                  Send
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
