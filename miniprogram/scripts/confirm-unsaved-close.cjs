/** Existing workflows explicitly choose to close while keeping isolated input. */
module.exports = async function confirmUnsavedClose(page) {
  const prompt = page.getByRole('dialog', { name: '保存修改？', exact: true });
  try { await prompt.waitFor({ state: 'visible', timeout: 300 }); }
  catch (error) { if (error.name === 'TimeoutError') return; throw error; }
  await prompt.getByRole('button', { name: '不保存', exact: true }).click();
};
