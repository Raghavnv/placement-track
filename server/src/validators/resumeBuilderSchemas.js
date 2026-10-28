const { z } = require('zod');

const line = (max) => z.string().trim().max(max).default('');
const bullets = z.array(z.string().trim().max(300)).max(6).default([]).transform((list) => list.filter(Boolean));
const list = (item, max) => z.array(item).max(max).default([]);

// Everything a student can put on a builder resume. Name, email and phone come from their profile.
const draft = z.object({
  headline: line(120),
  links: list(z.object({ label: line(30), url: line(200) }), 4).transform((l) => l.filter((x) => x.url)),
  summary: line(600),
  education: list(z.object({ institution: line(120), degree: line(120), years: line(40), score: line(40) }), 4),
  experience: list(z.object({ title: line(100), org: line(100), dates: line(40), bullets }), 5),
  projects: list(z.object({ name: line(100), tech: line(150), link: line(200), bullets }), 6),
  skills: list(z.string().trim().max(40), 30).transform((l) => [...new Set(l.filter(Boolean))]),
  achievements: list(z.string().trim().max(300), 8).transform((l) => l.filter(Boolean)),
  certifications: list(z.string().trim().max(200), 8).transform((l) => l.filter(Boolean)),
});

module.exports = { draft };
