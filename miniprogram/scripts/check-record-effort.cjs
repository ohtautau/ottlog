const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/lib', `${name}.ts`), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  new Function('exports', 'require', source)(exports, name => load(name.replace(/^\.\//, '')));
  modules.set(name, exports); return exports;
}
const data = load('domain-data'), progress = load('progress-draft'), entry = load('entry-draft');
const clone = value => JSON.parse(JSON.stringify(value));
const initial = () => require('./fixtures/starter-data.cjs').domainState(data);
const image = { id: 'progress-picture', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' };
const oldDual = (domainId = 'work') => {
  const draft = progress.newProgressDraft(domainId); delete draft.pair; delete draft.kinds; return draft;
};
const oldSingle = (domainId = 'work', kind = 'positive') => ({ ...oldDual(domainId), single: true, kind });
function freeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) if (child && typeof child === 'object' && !Object.isFrozen(child)) freeze(child);
  return value;
}const score = load('record-content'), edits = load('domain-record-edit');
const blank=progress.newProgressDraft('work'), original=JSON.stringify(blank);
assert.equal(score.recordEffortScore(blank.positive),0);assert.equal(JSON.stringify(blank),original);
for(const bad of [-1,0.5,Infinity,NaN,Number.MAX_SAFE_INTEGER+1,'2',null]) {
 const invalid=clone(blank);invalid.positive.effortScore=bad;assert.equal(progress.isProgressDraft(invalid),false);
}
assert.equal(score.adjustEffortScore({},-1),0);assert.equal(score.adjustEffortScore({effortScore:Number.MAX_SAFE_INTEGER},1),Number.MAX_SAFE_INTEGER);
let row=blank.positive;for(let i=0;i<20;i++)row={...row,effortScore:score.adjustEffortScore(row,1)};assert.equal(row.effortScore,20);
const draft={...blank,positive:{...blank.positive,effortScore:2,unknown:{kept:true}}};
const saved=progress.saveProgressDraft(initial(),draft), read=JSON.parse(JSON.stringify(saved));assert(data.isDomainState(read));
const find=state=>state.domains.find(d=>d.id==='work').positiveRecords.find(r=>r.id===draft.positive.id);
assert.equal(find(read).effortScore,2);assert.equal(find(read).content,'');assert.deepEqual(find(read).unknown,{kept:true});
assert.equal(progress.saveProgressDraft(saved,draft,true),saved);
const edit={version:1,domainId:'work',kind:'positive',original:find(read),record:{...find(read),effortScore:3}};
assert.deepEqual(clone(edits.unpackRecordEdit(edits.packRecordEdit(edit),'work','positive',edit.original)),clone(edit));
assert.equal(find(edits.editDomainRecord(read,edit)).effortScore,3);
const zero={...draft,positive:{...draft.positive,effortScore:0}};
assert.equal(progress.hasProgressContent(zero),false);assert.throws(()=>progress.saveProgressDraft(initial(),zero),/请先输入/);
assert.equal(find(progress.saveAutoProgressDraft(read,draft,zero)),undefined);
const remote=clone(read);find(remote).content='remote text';find(remote).images=[image];find(remote).remote='metadata';
const changed={...draft,positive:{...draft.positive,effortScore:4}};
const merged=progress.saveAutoProgressDraft(remote,draft,changed);assert.equal(find(merged).content,'remote text');assert.deepEqual(find(merged).images,[image]);assert.equal(find(merged).effortScore,4);assert.equal(find(merged).remote,'metadata');
const remoteScore=clone(read);find(remoteScore).effortScore=8;
const text={...draft,positive:{...draft.positive,content:'local text'}};
assert.equal(find(progress.saveAutoProgressDraft(remoteScore,draft,text)).effortScore,8);
const imageOnly={...draft,positive:{...draft.positive,images:[image]}};assert.equal(find(progress.saveAutoProgressDraft(remoteScore,draft,imageOnly)).effortScore,8);
assert.deepEqual(find(progress.saveAutoProgressDraft(remoteScore,draft,imageOnly)).images,[image]);
const blankBase=clone(blank);const beforeBlank=JSON.stringify(blankBase);progress.hasProgressContent(blankBase);progress.progressEntries({...blankBase,positive:{...blankBase.positive,content:'valid'}});assert.equal(JSON.stringify(blankBase),beforeBlank);
assert.equal(progress.saveAutoProgressDraft(initial(),null,blankBase).domains.flatMap(d=>d.positiveRecords).length,0);
assert.throws(()=>progress.saveAutoProgressDraft(remoteScore,draft,changed),/分数已变化/);
assert.equal(find(remoteScore).effortScore,8);assert.equal(changed.positive.effortScore,4);
const same=clone(read);find(same).effortScore=4;assert.equal(find(progress.saveAutoProgressDraft(same,draft,changed)).effortScore,4);
const old={...blank,positive:{...blank.positive,content:'old'}};const oldSaved=progress.saveProgressDraft(initial(),old);const oldBefore=JSON.stringify(old);
progress.progressEntries(old);assert.equal(JSON.stringify(old),oldBefore);assert(oldSaved.domains.flatMap(d=>d.positiveRecords).every(r=>!('effortScore' in r)));
const batch=progress.newProgressDraft('work');batch.positive.effortScore=1;batch.negative.effortScore=2;
batch.extraRecords=Array.from({length:38},(_,i)=>({kind:i%2?'positive':'negative',record:{...progress.newProgressInput(),effortScore:i+1}}));
assert.equal(progress.progressEntries(batch).length,40);assert(data.isDomainState(progress.saveProgressDraft(initial(),batch)));
assert.throws(()=>progress.writeProgressInput(batch,'positive',{...progress.newProgressInput(),effortScore:1}),/40/);
const full=initial();full.domains[0].positiveRecords=Array.from({length:data.MAX_DOMAIN_RECORDS},(_,i)=>({id:`full-score-${i}`,content:'',effortScore:1,createdAt:draft.positive.createdAt}));
assert(data.isDomainState(full));assert.throws(()=>progress.saveProgressDraft(full,draft),/5000/);
const single=progress.singleProgressDraft(draft);assert.equal(progress.pairedProgressDraft(single).positive.effortScore,2);
console.log('PASS effort fixtures: optional/invalid/bounds, repeated increments, score-only/zero, JSON reopen, same-ID retry, pack/unpack/edit, 40 rows/legacy, field merge and score conflict');
