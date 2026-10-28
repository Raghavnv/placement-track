const { z } = require('zod');

const lpa = (label) => z.coerce.number({ invalid_type_error: `${label} must be a number` }).min(0.5, `${label} must be at least 0.5 LPA`).max(200);

const updatePolicy = z
  .object({
    enabled: z.boolean(),
    dreamMinPackage: lpa('Dream cutoff'),
    superDreamMinPackage: lpa('Super Dream cutoff'),
  })
  .refine((p) => p.superDreamMinPackage > p.dreamMinPackage, {
    path: ['superDreamMinPackage'],
    message: 'Super Dream cutoff must be higher than the Dream cutoff',
  });

module.exports = { updatePolicy };
