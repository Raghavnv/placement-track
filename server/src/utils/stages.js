// Single source of truth for the application pipeline (api-contract.md 1.4).
const STAGES = ['applied', 'aptitude', 'interview', 'offer', 'rejected'];

const STAGE_LABELS = {
  applied: 'Applied',
  aptitude: 'Aptitude Test',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

const TRANSITIONS = {
  applied: ['aptitude', 'rejected'],
  aptitude: ['interview', 'rejected'],
  interview: ['offer', 'rejected'],
  offer: [],
  rejected: [],
};

const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

const emptyStageCounts = () => Object.fromEntries(STAGES.map((stage) => [stage, 0]));

module.exports = { STAGES, STAGE_LABELS, TRANSITIONS, canTransition, emptyStageCounts };
