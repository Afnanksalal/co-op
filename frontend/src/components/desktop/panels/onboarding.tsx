'use client';

import { useState } from 'react';
import { Briefcase, CaretRight } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { saveWorkspaceProfile, type DesktopState, type StartupProfile } from '@/lib/desktop/runtime';
import { ChoiceCard, Field, PanelTitle, TextArea } from '../shared';

export function OnboardingPanel({
  profile,
  onProfileChange,
  busyAction,
  runWithState,
  onComplete,
}: {
  profile: StartupProfile;
  onProfileChange: (profile: StartupProfile) => void;
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState(
    profile.goals || 'Build a clearer operating plan'
  );
  const update = <Key extends keyof StartupProfile>(key: Key, value: StartupProfile[Key]) =>
    onProfileChange({ ...profile, [key]: value });
  const steps = [
    { title: 'Name the business', text: 'Co-Op needs a business name and stage.' },
    { title: 'Tell Co-Op who you serve', text: 'One customer, one problem, one offer.' },
    { title: 'Pick the first win', text: 'Start with the work that matters today.' },
  ];
  const stageChoices = [
    { id: 'idea', label: 'Idea', detail: 'Still shaping the offer' },
    { id: 'mvp', label: 'MVP', detail: 'Product is being tested' },
    { id: 'launched', label: 'Launched', detail: 'Customers can buy now' },
    { id: 'growth', label: 'Growing', detail: 'Scaling sales and systems' },
  ];
  const goalChoices = [
    {
      id: 'Build a clearer operating plan',
      label: 'Operating plan',
      detail: 'Priorities, owners, risks, and next steps',
      area: 'operations',
    },
    {
      id: 'Find better customer angles',
      label: 'Customer growth',
      detail: 'Positioning, leads, outreach, and follow-up',
      area: 'sales',
    },
    {
      id: 'Understand money and runway',
      label: 'Money clarity',
      detail: 'Pricing, runway, funding, and scenarios',
      area: 'finance',
    },
    {
      id: 'Prepare for investor or partner review',
      label: 'Investor readiness',
      detail: 'Pitch, proof, risks, and narrative',
      area: 'strategy',
    },
  ];
  const ready =
    step === 0
      ? profile.companyName.trim().length >= 2
      : step === 1
        ? profile.targetCustomers.trim().length >= 2 &&
          profile.problem.trim().length >= 10 &&
          profile.solution.trim().length >= 5
        : selectedGoal.trim().length >= 5;

  async function finish() {
    const chosenGoal = goalChoices.find((goal) => goal.id === selectedGoal);
    const nextProfile: StartupProfile = {
      ...profile,
      founderRole: profile.founderRole || 'founder',
      tagline: profile.tagline || profile.solution.slice(0, 90),
      description:
        profile.description ||
        `${profile.companyName} helps ${profile.targetCustomers} with ${profile.solution}.`,
      goals: selectedGoal,
      businessModel: profile.businessModel || (chosenGoal?.area === 'sales' ? 'b2b' : 'other'),
      sector: profile.sector || 'other',
      onboardingCompletedAt: new Date().toISOString(),
    };
    onProfileChange(nextProfile);
    const saved = await runWithState(
      'onboarding',
      () => saveWorkspaceProfile(nextProfile),
      'Company profile saved.'
    );
    if (saved) onComplete();
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <aside className="rounded-lg border border-border/50 bg-card p-5">
        <Badge variant="secondary">Private first run</Badge>
        <h2 className="mt-4 max-w-sm text-2xl font-semibold tracking-normal">
          Set up Co-Op in three short steps.
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Answer only what Co-Op needs to make the first plan useful. You can add financials,
          documents, outreach details, and team context later.
        </p>
        <div className="mt-6 space-y-3">
          {steps.map((item, index) => {
            const active = step === index;
            const done = step > index;
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => setStep(index)}
                className={`flex w-full gap-3 rounded-lg border p-3 text-left transition-all ${
                  active
                    ? 'border-primary bg-primary/5'
                    : done
                      ? 'border-green-500/20 bg-green-500/5'
                      : 'border-border/60 bg-background hover:bg-muted/40'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : done
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {done ? 'OK' : index + 1}
                </span>
                <span>
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {item.text}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <form
        className="animate-fade-in min-h-[520px] rounded-lg border border-border bg-card p-5 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready) return;
          if (step < steps.length - 1) {
            setStep(step + 1);
            return;
          }
          void finish();
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <PanelTitle icon={Briefcase} title={steps[step].title} compact />
            <p className="mt-2 text-sm text-muted-foreground">{steps[step].text}</p>
          </div>
          <Badge variant="outline">
            {step + 1} of {steps.length}
          </Badge>
        </div>

        {step === 0 && (
          <div className="space-y-5">
            <Field
              label="Business name"
              value={profile.companyName}
              onChange={(companyName) => update('companyName', companyName)}
              placeholder="Acme Studio"
            />
            <Field
              label="Website"
              value={profile.website}
              onChange={(website) => update('website', website)}
              placeholder="https://example.com"
            />
            <div className="space-y-2">
              <Label>Where is the business today?</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {stageChoices.map((choice) => (
                  <ChoiceCard
                    key={choice.id}
                    selected={profile.stage === choice.id}
                    title={choice.label}
                    text={choice.detail}
                    onClick={() => update('stage', choice.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <Field
              label="Best customer"
              value={profile.targetCustomers}
              onChange={(targetCustomers) => update('targetCustomers', targetCustomers)}
              placeholder="Example: independent clinics, local restaurants, B2B SaaS founders"
            />
            <TextArea
              label="Problem they have"
              value={profile.problem}
              onChange={(problem) => update('problem', problem)}
              minHeight="min-h-28"
              placeholder="What is painful, expensive, slow, risky, or confusing for them?"
            />
            <TextArea
              label="What you offer"
              value={profile.solution}
              onChange={(solution) => update('solution', solution)}
              minHeight="min-h-28"
              placeholder="Explain the outcome you help them get."
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {goalChoices.map((goal) => (
                <ChoiceCard
                  key={goal.id}
                  selected={selectedGoal === goal.id}
                  title={goal.label}
                  text={goal.detail}
                  onClick={() => {
                    setSelectedGoal(goal.id);
                    update('goals', goal.id);
                  }}
                />
              ))}
            </div>
            <TextArea
              label="Anything urgent?"
              value={profile.goals}
              onChange={(goals) => {
                setSelectedGoal(goals);
                update('goals', goals);
              }}
              minHeight="min-h-24"
              placeholder="Optional: a deadline, launch, sales goal, fundraise, hiring issue, or messy decision."
            />
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border/50 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0 || busyAction === 'onboarding'}
          >
            Back
          </Button>
          <Button type="submit" disabled={!ready || busyAction === 'onboarding'}>
            {busyAction === 'onboarding'
              ? 'Saving...'
              : step === steps.length - 1
                ? 'Finish setup'
                : 'Continue'}
            <CaretRight className="h-4 w-4" weight="bold" />
          </Button>
        </div>
      </form>
    </section>
  );
}
