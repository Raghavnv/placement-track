const mongoose = require('mongoose');
const { STAGES } = require('../utils/stages');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    link: { type: String, trim: true, maxlength: 500, default: '' }, // test link, form, venue map…
    drive: { type: mongoose.Schema.Types.ObjectId, ref: 'Drive', default: null }, // null = every student
    stages: { type: [{ type: String, enum: STAGES }], default: [] }, // with a drive: only applicants at these stages; empty = all
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ drive: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
