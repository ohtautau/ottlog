// Explicit empty domains keep daily UI cases independent of prior persisted fixtures.
module.exports = function habitDomainFixture() {
  return { version: 1, domains: [
    ['growth', '成长', 'plant'], ['work', '工作', 'work'], ['english', '英语', 'language'], ['fitness', '健身', 'exercise'],
    ['life', '生活', 'home'], ['mind', '心理', 'breathe'], ['photo', '摄影', 'camera'], ['media', '自媒体', 'film'],
  ].map(([id, name, iconId]) => ({ id, name, iconId, longTermGoal: null, shortTermGoal: null, habits: [], positiveRecords: [], negativeRecords: [] })), completedGoals: [] };
};
