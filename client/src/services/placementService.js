import api from './api';

// Placement policy: drive tiers (Regular / Dream / Super Dream) and who may apply after an offer.
export const getPolicy = () => api.get('/placement/policy').then((r) => r.data); // { policy, tiers }
export const updatePolicy = (policy) => api.put('/placement/policy', policy).then((r) => r.data);
export const getMyPlacement = () => api.get('/placement/me').then((r) => r.data); // { placement, policy, tiers }

export const TIER_LABELS = { regular: 'Regular', dream: 'Dream', 'super-dream': 'Super Dream' };

// Same rule as server/src/utils/placement.js tierOf.
export const tierOf = (pkg, policy) =>
  pkg >= policy.superDreamMinPackage ? 'super-dream' : pkg >= policy.dreamMinPackage ? 'dream' : 'regular';
