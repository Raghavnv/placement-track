// Mirrors server/src/utils/stages.js (api-contract.md 1.4).
export const STAGES = ['applied', 'aptitude', 'interview', 'offer', 'rejected'];
export const PIPELINE = ['applied', 'aptitude', 'interview', 'offer'];

export const STAGE_LABELS = {
  applied: 'Applied',
  aptitude: 'Aptitude Test',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

export const TRANSITIONS = {
  applied: ['aptitude', 'rejected'],
  aptitude: ['interview', 'rejected'],
  interview: ['offer', 'rejected'],
  offer: [],
  rejected: [],
};

export const KANBAN_COLUMNS = [
  { key: 'applied', label: 'Applied', stages: ['applied'] },
  { key: 'aptitude', label: 'Aptitude Test', stages: ['aptitude'] },
  { key: 'interview', label: 'Interview', stages: ['interview'] },
  { key: 'result', label: 'Offer / Rejected', stages: ['offer', 'rejected'] },
];

export const isFinal = (stage) => TRANSITIONS[stage]?.length === 0;

// The last real round reached before a rejection, e.g. "aptitude".
export function rejectedAt(application) {
  const history = application.stageHistory || [];
  const beforeReject = history.filter((h) => h.stage !== 'rejected');
  return beforeReject.length ? beforeReject[beforeReject.length - 1].stage : 'applied';
}

export const appliedAt = (application) => application.stageHistory?.[0]?.changedAt || application.createdAt;

// Pipeline steps the application has reached, for the progress dots.
export function reachedStages(application) {
  const reached = new Set((application.stageHistory || []).map((h) => h.stage));
  reached.add(application.stage === 'rejected' ? rejectedAt(application) : application.stage);
  return reached;
}
