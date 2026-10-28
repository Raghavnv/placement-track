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

// What a student is told when an officer moves them (bell and email).
function stageNotice(stage, drive, remark = '') {
  const where = `${drive.role} at ${drive.companyName}`;
  const text = {
    aptitude: `You're through to the aptitude test for ${where}.`,
    interview: `You're through to the interview round for ${where}.`,
    offer: `Congratulations! ${drive.companyName} has made you an offer for ${drive.role}.`,
    rejected: `${drive.companyName} has closed your application for ${drive.role}.`,
  }[stage];
  return {
    type: 'stage',
    title: stage === 'offer' ? `Offer from ${drive.companyName}` : `${STAGE_LABELS[stage]}: ${drive.companyName}`,
    body: [text, remark && `Note from the placement cell: ${remark}`].filter(Boolean).join('\n'),
    link: '/student/applications',
  };
}

const emptyStageCounts = () => Object.fromEntries(STAGES.map((stage) => [stage, 0]));

module.exports = { STAGES, STAGE_LABELS, TRANSITIONS, canTransition, emptyStageCounts, stageNotice };
