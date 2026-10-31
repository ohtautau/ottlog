// Explicit historical fixtures for model tests. Production defaults stay empty.
exports.domainState = model => ({ version: 1, domains: JSON.parse(JSON.stringify(model.legacyHabitDomains)), completedGoals: [] });
exports.growthState = model => ({ version: 1, domains: require('./example-records.cjs').demoGrowthState(new Date('2026-10-01T12:00:00Z')).domains.map(({ currentGoal, ...domain }) => domain), events: [], completedGoals: [] });
