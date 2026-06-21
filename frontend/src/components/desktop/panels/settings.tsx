'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  CaretDown,
  EnvelopeSimple,
  HardDrives,
  MagnifyingGlass,
  Plugs,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  saveIntegration,
  saveModelSettings,
  type DesktopState,
  type ModelSettings,
  type ModelSettingsUpdate,
} from '@/lib/desktop/runtime';
import { reviewModeLabels } from '../constants';
import { DesktopPage, Field, PanelTitle, SegmentedControl, SelectField } from '../shared';
import { looksLikeEmail } from '../utils';

export function SettingsPanel({
  settings,
  setSettings,
  busyAction,
  runWithState,
}: {
  settings: ModelSettings;
  setSettings: (value: ModelSettings) => void;
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
}) {
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [firecrawlApiKey, setFirecrawlApiKey] = useState('');
  const [emailApiKey, setEmailApiKey] = useState('');
  const [settingsTab, setSettingsTab] = useState(
    settings.firecrawlApiKeySaved ? 'model' : 'research'
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [integration, setIntegration] = useState({
    name: '',
    kind: 'mcp',
    baseUrl: '',
    enabled: true,
  });
  const update = (patch: Partial<ModelSettings>) =>
    setSettings({ ...settings, researchProvider: 'firecrawl', ...patch });
  const settingsPayload: ModelSettingsUpdate = {
    ...settings,
    researchProvider: 'firecrawl',
    openaiApiKey,
    firecrawlApiKey,
    emailApiKey,
  };
  const integrationReady =
    integration.name.trim().length >= 2 && integration.baseUrl.trim().length > 0;
  const needsModelKey = settings.provider === 'openai_compatible' && !settings.openaiApiKeySaved;
  const needsFirecrawlKey = !settings.firecrawlApiKeySaved;
  const needsEmailKey = settings.emailProvider !== 'none' && !settings.emailApiKeySaved;
  const modelReady =
    settings.provider !== 'openai_compatible' ||
    settings.openaiApiKeySaved ||
    openaiApiKey.trim().length > 0;
  const researchReady = settings.firecrawlApiKeySaved || firecrawlApiKey.trim().length > 0;
  const emailReady =
    settings.emailProvider === 'none' ||
    ((settings.emailApiKeySaved || emailApiKey.trim().length > 0) &&
      looksLikeEmail(settings.emailFrom));
  const settingsReady = modelReady && researchReady && emailReady;

  async function saveSettings() {
    const saved = await runWithState(
      'settings',
      () => saveModelSettings(settingsPayload),
      'Settings saved.'
    );
    if (saved) {
      setOpenaiApiKey('');
      setFirecrawlApiKey('');
      setEmailApiKey('');
    }
  }

  const settingTabs = [
    { id: 'model', label: 'Assistant' },
    { id: 'research', label: 'Sources' },
    { id: 'email', label: 'Email' },
    { id: 'integrations', label: 'Connections' },
  ];

  const saveLabel =
    settingsTab === 'model'
      ? 'Save assistant settings'
      : settingsTab === 'research'
        ? 'Save web sources'
        : 'Save email settings';

  useEffect(() => {
    if (!settings.firecrawlApiKeySaved) {
      setSettingsTab('research');
    }
  }, [settings.firecrawlApiKeySaved]);

  if (settingsTab === 'integrations') {
    return (
      <DesktopPage className="mx-auto w-full max-w-5xl space-y-5">
        <SettingsHeader
          currentTab={settingsTab}
          onTabChange={setSettingsTab}
          options={settingTabs}
        />
        <form
          className="rounded-lg border border-border bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void runWithState(
              'integration',
              () => saveIntegration(integration),
              'Integration saved.'
            );
          }}
        >
          <PanelTitle icon={Plugs} title="Local connections" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Name"
              value={integration.name}
              onChange={(name) => setIntegration({ ...integration, name })}
            />
            <SelectField
              label="Type"
              value={integration.kind}
              onChange={(kind) => setIntegration({ ...integration, kind })}
              options={['mcp', 'webhook', 'notion', 'crm', 'custom']}
            />
            <div className="md:col-span-2">
              <Field
                label="Service address"
                value={integration.baseUrl}
                onChange={(baseUrl) => setIntegration({ ...integration, baseUrl })}
                placeholder="https://service.example.com"
              />
            </div>
          </div>
          <Button
            className="mt-5"
            type="submit"
            disabled={busyAction === 'integration' || !integrationReady}
          >
            Save integration
          </Button>
        </form>
      </DesktopPage>
    );
  }

  return (
    <DesktopPage className="mx-auto w-full max-w-5xl space-y-5">
      <SettingsHeader currentTab={settingsTab} onTabChange={setSettingsTab} options={settingTabs} />
      <form
        className="rounded-lg border border-border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void saveSettings();
        }}
      >
        {settingsTab === 'model' && (
          <div className="space-y-5">
            <PanelTitle icon={HardDrives} title="Assistant settings" />
            <p className="text-sm leading-6 text-muted-foreground">
              Choose where Co-Op gets answers. Keep the everyday setup simple; service addresses and
              model names live in Advanced.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Where answers come from"
                value={settings.provider}
                onChange={(provider) => update({ provider })}
                options={['ollama', 'openai_compatible']}
                labels={{
                  ollama: 'This computer',
                  openai_compatible: 'My private API key',
                }}
              />
              <SelectField
                label="Review style"
                value={settings.councilMode}
                onChange={(councilMode) => update({ councilMode })}
                options={['off', 'review_only', 'high_risk_only', 'full_council']}
                labels={reviewModeLabels}
              />
              {settings.provider === 'openai_compatible' && (
                <div className="md:col-span-2">
                  <Field
                    label={settings.openaiApiKeySaved ? 'Replace private key' : 'Private key'}
                    value={openaiApiKey}
                    type="password"
                    onChange={setOpenaiApiKey}
                  />
                  <SecretStatus
                    saved={settings.openaiApiKeySaved}
                    pending={openaiApiKey.trim().length > 0}
                    required={needsModelKey}
                  />
                </div>
              )}
            </div>
            <AdvancedSection
              open={advancedOpen}
              onToggle={() => setAdvancedOpen((value) => !value)}
            >
              <div className="grid gap-4 md:grid-cols-2">
                {settings.provider === 'ollama' ? (
                  <>
                    <Field
                      label="Local assistant address"
                      value={settings.ollamaBaseUrl}
                      onChange={(ollamaBaseUrl) => update({ ollamaBaseUrl })}
                    />
                    <Field
                      label="Local assistant model"
                      value={settings.ollamaModel}
                      onChange={(ollamaModel) => update({ ollamaModel })}
                    />
                  </>
                ) : (
                  <>
                    <Field
                      label="Assistant service address"
                      value={settings.openaiBaseUrl}
                      onChange={(openaiBaseUrl) => update({ openaiBaseUrl })}
                    />
                    <Field
                      label="Assistant model"
                      value={settings.openaiModel}
                      onChange={(openaiModel) => update({ openaiModel })}
                    />
                  </>
                )}
                <Field
                  label="Response limit"
                  type="number"
                  value={String(settings.maxRunTokens)}
                  onChange={(value) => update({ maxRunTokens: Number(value) })}
                />
              </div>
            </AdvancedSection>
          </div>
        )}

        {settingsTab === 'research' && (
          <div className="space-y-5">
            <PanelTitle icon={MagnifyingGlass} title="Web sources" />
            <p className="text-sm leading-6 text-muted-foreground">
              Web search is required for market, competitor, legal, customer, pricing, investor, and
              risk answers. Keys stay on this computer.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Field
                  label={
                    settings.firecrawlApiKeySaved ? 'Replace web search key' : 'Web search key'
                  }
                  value={firecrawlApiKey}
                  type="password"
                  onChange={setFirecrawlApiKey}
                />
                <SecretStatus
                  saved={settings.firecrawlApiKeySaved}
                  pending={firecrawlApiKey.trim().length > 0}
                  required={needsFirecrawlKey}
                />
              </div>
            </div>
            <AdvancedSection
              open={advancedOpen}
              onToggle={() => setAdvancedOpen((value) => !value)}
            >
              <Field
                label="Web search service address"
                value={settings.firecrawlBaseUrl}
                onChange={(firecrawlBaseUrl) => update({ firecrawlBaseUrl })}
              />
            </AdvancedSection>
          </div>
        )}

        {settingsTab === 'email' && (
          <div className="space-y-5">
            <PanelTitle icon={EnvelopeSimple} title="Email" />
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Email sender"
                value={settings.emailProvider}
                onChange={(emailProvider) => update({ emailProvider })}
                options={['none', 'resend', 'sendgrid']}
                labels={{ none: 'None', resend: 'Resend', sendgrid: 'SendGrid' }}
              />
              {settings.emailProvider !== 'none' && (
                <>
                  <Field
                    label={settings.emailApiKeySaved ? 'Replace email key' : 'Email service key'}
                    value={emailApiKey}
                    type="password"
                    onChange={setEmailApiKey}
                  />
                  <SecretStatus
                    saved={settings.emailApiKeySaved}
                    pending={emailApiKey.trim().length > 0}
                    required={needsEmailKey}
                  />
                  <Field
                    label="Sender email"
                    value={settings.emailFrom}
                    onChange={(emailFrom) => update({ emailFrom })}
                  />
                  <Field
                    label="Sender name"
                    value={settings.emailFromName}
                    onChange={(emailFromName) => update({ emailFromName })}
                  />
                </>
              )}
            </div>
          </div>
        )}

        <Button
          className="mt-6"
          type="submit"
          disabled={busyAction === 'settings' || !settingsReady}
        >
          {saveLabel}
        </Button>
      </form>
    </DesktopPage>
  );
}

function SettingsHeader({
  currentTab,
  onTabChange,
  options,
}: {
  currentTab: string;
  onTabChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="sticky top-0 z-20 flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-normal">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Keys stay on this computer in the operating system credential store.
        </p>
      </div>
      <SegmentedControl value={currentTab} options={options} onChange={onTabChange} />
    </div>
  );
}

function AdvancedSection({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium"
      >
        <span>Advanced</span>
        <CaretDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-border/60 p-4">{children}</div>}
    </div>
  );
}

function SecretStatus({
  saved,
  pending,
  required,
}: {
  saved: boolean;
  pending: boolean;
  required: boolean;
}) {
  const text = pending
    ? 'New key ready to save'
    : saved
      ? 'Key saved'
      : required
        ? 'Key required'
        : 'No key saved';
  return (
    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className={`h-2 w-2 rounded-full ${
          pending || saved ? 'bg-green-500' : required ? 'bg-amber-500' : 'bg-muted-foreground/50'
        }`}
      />
      <span>{text}</span>
    </div>
  );
}
