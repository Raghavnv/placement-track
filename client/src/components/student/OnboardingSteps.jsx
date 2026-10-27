import MetroLine from '../common/MetroLine';

export const ONBOARDING_STEPS = [
  { key: 'account', label: 'Account' },
  { key: 'academics', label: 'Academics' },
  { key: 'skills', label: 'Skills' },
  { key: 'resume', label: 'Resume' },
  { key: 'interests', label: 'Interests' },
  { key: 'roles', label: 'Roles' },
  { key: 'preferences', label: 'Preferences' },
];

export default function OnboardingSteps({ current }) {
  const index = ONBOARDING_STEPS.findIndex((s) => s.key === current);
  return (
    <div className="onboarding-steps">
      <p className="onboarding-steps__count">
        Step {index + 1} <span>of {ONBOARDING_STEPS.length}</span>
      </p>
      <MetroLine stations={ONBOARDING_STEPS} current={current} compact />
    </div>
  );
}
