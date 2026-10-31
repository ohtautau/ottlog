// Reminder controls now share the four-column wheel regression and DST fixtures.
module.exports = options => require('./check-unified-time-wheels-ui.cjs')({ ...options, reminderOnly: true });