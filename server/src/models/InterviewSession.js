const mongoose = require('mongoose');

const KINDS = ['technical', 'scenario', 'project', 'behavioural'];

const questionSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: KINDS, required: true },
    focus: { type: String, maxlength: 80, default: '' }, // the skill or area it tests
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    question: { type: String, required: true, maxlength: 800 },
    rubric: { type: [String], default: [] }, // what a strong answer covers; hidden until graded
    answer: { type: String, maxlength: 4000, default: '' },
    // Filled in when the interview is graded:
    score: { type: Number, min: 0, max: 10, default: null },
    feedback: { type: String, maxlength: 600, default: '' },
    strongAnswer: { type: String, maxlength: 800, default: '' },
  },
  { _id: false },
);

// One AI mock interview for one drive or outside job. Questions are written up front from the posting;
// answers are saved as the student goes; grading happens once, when they finish.
const interviewSessionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    target: {
      kind: { type: String, enum: ['drive', 'job'], required: true },
      key: { type: String, required: true }, // "drive:<id>" or "job:<id>"
      drive: { type: mongoose.Schema.Types.ObjectId, ref: 'Drive', default: null },
      title: { type: String, required: true, maxlength: 300 },
      level: { type: String, required: true }, // difficulty band used for the questions
    },
    questions: { type: [questionSchema], required: true },
    status: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' },
    report: { type: mongoose.Schema.Types.Mixed, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

interviewSessionSchema.index({ student: 1, createdAt: -1 });

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
module.exports.KINDS = KINDS;
