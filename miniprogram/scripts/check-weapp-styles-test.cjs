const assert = require('node:assert/strict');
const { checkStyles } = require('./check-weapp-styles.cjs');
for (const source of ['.title{;margin-bottom:6PX}', '.title{margin:0;;}', '@media (min-width:600px){;.title{margin:0}}', ';.title{margin:0}', '.title{margin:0};']) {
  assert.throws(() => checkStyles(source, 'fixture.wxss'), /empty WXSS statement/, source);
}
for (const source of ['.title{margin-bottom:6PX}', '.title{margin:0;}', '.title{/* ; */margin:0}', '.title{content:"a;b";--value:";"}', '@import "common.wxss";@media (min-width:600px){.title{margin:0}}']) {
  assert.doesNotThrow(() => checkStyles(source, 'fixture.wxss'), source);
}
assert.throws(() => checkStyles('.title{margin:0', 'fixture.wxss'), /Unclosed block/);
for (const source of ['.editor-fields-layout > *{flex-shrink:0}', '*{margin:0}', '.field,*:not(.hidden){margin:0}', '@media (min-width:600px){.field *{margin:0}}']) {
  assert.throws(() => checkStyles(source, 'fixture.wxss'), /unsupported WXSS universal selector/, source);
}
for (const source of ['.field > view,.field > textarea{flex-shrink:0}', '[data-title="*"]{margin:0}', '[data-title*="field"]{margin:0}', '.field{/* * */content:"*";width:calc(2 * 4px)}']) {
  assert.doesNotThrow(() => checkStyles(source, 'fixture.wxss'), source);
}
for (const source of ['.navigation > :first-child{flex:1}', '.navigation :nth-child(2){margin:0}', ':last-child{margin:0}']) {
  assert.throws(() => checkStyles(source, 'fixture.wxss'), /structural pseudo-class requires an explicit/, source);
}
for (const source of ['.navigation > .categories{flex:1}', '.navigation > .categories:first-child{flex:1}', '.navigation > view:first-child{flex:1}', '.navigation > view:not(:first-child){margin:0}']) {
  assert.doesNotThrow(() => checkStyles(source, 'fixture.wxss'), source);
}
console.log('PASS WXSS guards: empty statements, universal and bare structural pseudo selectors rejected; valid scoped selectors, declarations, strings, comments, imports and nested media preserved.');
