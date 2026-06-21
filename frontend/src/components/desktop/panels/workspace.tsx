'use client';

import { useState } from 'react';
import { Briefcase, ChartBar } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  saveWorkspaceProfile,
  type DesktopState,
  type StartupProfile,
} from '@/lib/desktop/runtime';
import {
  businessModels,
  founderRoles,
  fundingStages,
  optionLabels,
  revenueModels,
  revenueStatuses,
  sectors,
  startupStages,
  teamSizes,
} from '../constants';
import {
  DateField,
  Field,
  PanelTitle,
  Rows,
  SectionHeading,
  SegmentedControl,
  SelectField,
  TextArea,
} from '../shared';
import {
  formatProfileUpdated,
  labelOption,
  numberToInput,
  optionalIntegerFromInput,
  optionalNumberFromInput,
  workspaceCompletion,
} from '../utils';

export function WorkspacePanel({
  profile,
  onProfileChange,
  busyAction,
  runWithState,
}: {
  profile: StartupProfile;
  onProfileChange: (profile: StartupProfile) => void;
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
}) {
  const journey = ['idea', 'prototype'].includes(profile.stage) ? 'idea' : 'scale';
  const [profileTab, setProfileTab] = useState('essentials');
  const update = <Key extends keyof StartupProfile>(key: Key, value: StartupProfile[Key]) =>
    onProfileChange({ ...profile, [key]: value });
  const setJourney = (value: string) => {
    update('stage', value === 'idea' ? 'idea' : profile.stage === 'idea' ? 'mvp' : profile.stage);
  };

  return (
    <form
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        void runWithState(
          'workspace',
          () => saveWorkspaceProfile(profile),
          'Profile saved locally.'
        );
      }}
    >
      <div className="shrink-0 border-b border-border/60 pb-4">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="min-w-0">
            <PanelTitle icon={Briefcase} title="Company profile" compact />
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Keep the profile simple first. Add deeper market, money, and operating details only
              when they help Co-Op make better work.
            </p>
          </div>
          <SegmentedControl
            value={journey}
            onChange={setJourney}
            options={[
              { id: 'idea', label: 'Idea to startup' },
              { id: 'scale', label: 'Startup to scale' },
            ]}
          />
        </div>
        <div className="mt-4 flex max-w-full">
          <SegmentedControl
            value={profileTab}
            onChange={setProfileTab}
            options={[
              { id: 'essentials', label: 'Essentials' },
              { id: 'market', label: 'Market' },
              { id: 'operations', label: 'Operations' },
            ]}
          />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 pt-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:overflow-hidden 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="coop-scrollbar min-h-0 space-y-6 overflow-y-auto pb-12 pr-1">
          {profileTab === 'essentials' && (
            <section className="animate-fade-in space-y-4">
              <SectionHeading
                title="Basics"
                detail="The short version Co-Op should remember first"
              />
              <div className="grid gap-4 lg:grid-cols-3">
                <Field
                  label="Founder name"
                  value={profile.founderName}
                  onChange={(founderName) => update('founderName', founderName)}
                />
                <SelectField
                  label="Founder role"
                  value={profile.founderRole}
                  onChange={(founderRole) => update('founderRole', founderRole)}
                  options={founderRoles}
                  labels={optionLabels}
                />
                <Field
                  label="Company name"
                  value={profile.companyName}
                  onChange={(companyName) => update('companyName', companyName)}
                />
                <Field
                  label="Tagline"
                  value={profile.tagline}
                  onChange={(tagline) => update('tagline', tagline)}
                />
                <Field
                  label="Website"
                  value={profile.website}
                  onChange={(website) => update('website', website)}
                />
                <SelectField
                  label="Stage"
                  value={profile.stage}
                  onChange={(stage) => update('stage', stage)}
                  options={startupStages}
                  labels={optionLabels}
                />
              </div>
              <TextArea
                label="Company description"
                value={profile.description}
                onChange={(description) => update('description', description)}
                minHeight="min-h-24"
              />
            </section>
          )}

          {profileTab === 'market' && (
            <section className="animate-fade-in space-y-4">
              <SectionHeading
                title="Customers and offer"
                detail="Who buys, why they care, and how the business earns"
              />
              <div className="grid gap-4 lg:grid-cols-3">
                <Field
                  label="Industry"
                  value={profile.industry}
                  onChange={(industry) => update('industry', industry)}
                />
                <SelectField
                  label="Market category"
                  value={profile.sector}
                  onChange={(sector) => update('sector', sector)}
                  options={sectors}
                  labels={optionLabels}
                />
                <SelectField
                  label="Business model"
                  value={profile.businessModel}
                  onChange={(businessModel) => update('businessModel', businessModel)}
                  options={businessModels}
                  labels={optionLabels}
                />
                <SelectField
                  label="Revenue model"
                  value={profile.revenueModel}
                  onChange={(revenueModel) => update('revenueModel', revenueModel)}
                  options={revenueModels}
                  labels={optionLabels}
                />
                <SelectField
                  label="Revenue status"
                  value={profile.isRevenue}
                  onChange={(isRevenue) => update('isRevenue', isRevenue)}
                  options={revenueStatuses}
                  labels={optionLabels}
                />
                <Field
                  label="Target customers"
                  value={profile.targetCustomers}
                  onChange={(targetCustomers) => update('targetCustomers', targetCustomers)}
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <TextArea
                  label="Problem"
                  value={profile.problem}
                  onChange={(problem) => update('problem', problem)}
                />
                <TextArea
                  label="Solution"
                  value={profile.solution}
                  onChange={(solution) => update('solution', solution)}
                />
                <TextArea
                  label="Competitive advantage"
                  value={profile.competitiveAdvantage}
                  onChange={(competitiveAdvantage) =>
                    update('competitiveAdvantage', competitiveAdvantage)
                  }
                />
                <TextArea
                  label="Goals"
                  value={profile.goals}
                  onChange={(goals) => update('goals', goals)}
                />
              </div>
            </section>
          )}

          {profileTab === 'operations' && (
            <section className="animate-fade-in space-y-4">
              <SectionHeading
                title="Operating details"
                detail="Team, geography, traction, funding, and dates"
              />
              <div className="grid gap-4 lg:grid-cols-4">
                <SelectField
                  label="Team size"
                  value={profile.teamSize}
                  onChange={(teamSize) => update('teamSize', teamSize)}
                  options={teamSizes}
                />
                <Field
                  label="Co-founder count"
                  type="number"
                  value={numberToInput(profile.cofounderCount)}
                  onChange={(value) => update('cofounderCount', optionalIntegerFromInput(value))}
                />
                <Field
                  label="Founded year"
                  type="number"
                  value={numberToInput(profile.foundedYear)}
                  onChange={(value) => update('foundedYear', optionalIntegerFromInput(value))}
                />
                <DateField
                  label="Launch date"
                  value={profile.launchDate}
                  onChange={(launchDate) => update('launchDate', launchDate)}
                />
                <Field
                  label="Country"
                  value={profile.country}
                  onChange={(country) => update('country', country)}
                />
                <Field
                  label="City"
                  value={profile.city}
                  onChange={(city) => update('city', city)}
                />
                <Field
                  label="Location"
                  value={profile.location}
                  onChange={(location) => update('location', location)}
                />
                <Field
                  label="Operating regions"
                  value={profile.operatingRegions}
                  onChange={(operatingRegions) => update('operatingRegions', operatingRegions)}
                />
                <SelectField
                  label="Funding stage"
                  value={profile.fundingStage}
                  onChange={(fundingStage) => update('fundingStage', fundingStage)}
                  options={fundingStages}
                  labels={optionLabels}
                />
                <Field
                  label="Total raised"
                  type="number"
                  value={numberToInput(profile.totalRaised)}
                  onChange={(value) => update('totalRaised', optionalNumberFromInput(value))}
                />
                <Field
                  label="Monthly revenue"
                  type="number"
                  value={numberToInput(profile.monthlyRevenue)}
                  onChange={(value) => update('monthlyRevenue', optionalNumberFromInput(value))}
                />
              </div>
              <TextArea
                label="Traction"
                value={profile.traction}
                onChange={(traction) => update('traction', traction)}
                minHeight="min-h-24"
              />
            </section>
          )}
        </div>

        <aside className="coop-scrollbar min-h-0 overflow-y-auto rounded-lg border border-border/50 bg-background p-4">
          <PanelTitle icon={ChartBar} title="Profile status" compact />
          <div className="mt-4 flex items-end justify-between gap-3">
            <span className="text-sm text-muted-foreground">Profile completeness</span>
            <span className="text-2xl font-semibold">{workspaceCompletion(profile)}%</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${workspaceCompletion(profile)}%` }}
            />
          </div>
          <div className="mt-4">
            <Rows
              rows={[
                ['Journey', journey === 'idea' ? 'Idea to startup' : 'Startup to scale'],
                ['Stage', labelOption(profile.stage)],
                ['Sector', labelOption(profile.sector)],
                ['Business type', labelOption(profile.businessModel) || '-'],
                ['Updated', formatProfileUpdated(profile.updatedAt)],
              ]}
            />
          </div>
          <div className="sticky bottom-0 -mx-4 mt-5 border-t border-border/60 bg-background px-4 pb-1 pt-3">
            <Button className="w-full" type="submit" disabled={busyAction === 'workspace'}>
              Save profile
            </Button>
          </div>
        </aside>
      </div>
    </form>
  );
}
