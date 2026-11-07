// Render the real signed editor with deterministic React hooks, no API/storage.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const cache=new Map(),slots=[];let cursor=0;
const handle={};
const react={createElement:(type,props,...children)=>({type,props:{...props,children:children.flat()}}),useRef:value=>{const i=cursor++;return slots[i]??(slots[i]={current:value});},useState:value=>{const i=cursor++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return [slots[i],next=>slots[i]=typeof next==='function'?next(slots[i]):next];},useEffect:()=>{},forwardRef:fn=>props=>fn(props,handle),useImperativeHandle:(_ref,create)=>Object.assign(handle,create())};
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React}}).outputText;new Function('React','module','exports','require',output)(react,module,module.exports,dep=>{if(dep==='react')return react;if(dep==='@tarojs/components')return {View:'View',Text:'Text'};if(dep.endsWith('.css'))return {};if(file.split(path.sep).includes('components')&&!dep.startsWith('../lib/')&&dep!=='./editor-copy')return {default:dep,DeleteSymbol:'delete'};return load(path.resolve(path.dirname(file),dep+'.ts'));});return module.exports;}
const progress=load(path.resolve(__dirname,'../src/lib/progress-draft.ts'));
const exportsUI=load(path.resolve(__dirname,'../src/components/progress-editor-fields.tsx'));
const component=exportsUI.default;
let draft=progress.newProgressDraft('other'),disabled=false;
const render=()=>{cursor=0;return component({draft,state:{version:1,domains:[],completedGoals:[]},disabled,owner:'isolated',onBusyChange:()=>{},onChange:next=>draft=next});};
const all=(node,predicate)=>{if(!node||typeof node!=='object')return [];return [...(predicate(node)?[node]:[]),...(node.props?.children||[]).flatMap(child=>all(child,predicate))];};
const editors=tree=>all(tree,n=>n.type==='./markdown-note-editor');
const buttons=tree=>all(tree,n=>n.type==='./record-action-row').map(n=>({props:{...n.props,onClick:n.props.onAttach}}));
let tree=render();assert.equal(buttons(tree).length,2);
const negative=editors(tree)[0],positive=editors(tree)[1];
assert.equal(negative.props.placeholder,'记录内容');assert.equal(positive.props.format,'plain');
// Empty column targets its own trailing input; click itself creates no data.
buttons(tree)[0].props.onClick();tree=render();assert.equal(editors(tree)[0].props.insertionSignal,1);assert.equal(editors(tree)[1].props.insertionSignal,0);assert.equal(progress.hasProgressContent(draft),false);
// Fill two positives and one negative. Clicking the older row targets that stable ID.
positive.props.onChange('正一');tree=render();assert.equal(editors(tree).length,2,'typing must not add a blank row');editors(tree).find(n=>n.props.value==='正一').props.onConfirm();tree=render();let fields=editors(tree);fields.find(n=>n.props.value===''&&n.props.recordId!==negative.props.recordId).props.onChange('正二');tree=render();editors(tree).find(n=>n.props.recordId===negative.props.recordId).props.onChange('负一');tree=render();
const older=editors(tree).find(n=>n.props.value==='正一');older.props.onFocus();tree=render();buttons(tree)[1].props.onClick();tree=render();
assert.equal(editors(tree).find(n=>n.props.value==='正二').props.insertionSignal,0);assert.equal(editors(tree).find(n=>n.props.value==='正一').props.insertionSignal,1);
buttons(tree)[0].props.onClick();tree=render();assert.equal(editors(tree).find(n=>n.props.value==='负一').props.insertionSignal,2);
assert.equal(editors(tree).find(n=>n.props.value==='正二').props.insertionSignal,0);
const tail=editors(tree).find(n=>n.props.value==='正二');tail.props.onConfirm();tree=render();
let blank=editors(tree).find(n=>n.props.value==='');assert(blank);blank.props.onConfirm();tree=render();assert.equal(editors(tree).length,4,'repeat confirm keeps one spare');
blank=editors(tree).find(n=>n.props.value==='');blank.props.onChange('  ');tree=render();blank.props.onBlur();tree=render();assert.equal(editors(tree).length,3,'blank blur removes only spare');assert.deepEqual(progress.progressRows(draft).filter(r=>r.record.content.trim()).map(r=>r.record.content).sort(),['正一','正二','负一'].sort());
// Rapid calls through one render must read the newest draft ref.
const action=buttons(tree)[1];action.props.onAdjust(1);action.props.onAdjust(1);tree=render();
assert.equal(progress.progressRows(draft).find(r=>r.record.content==='正一').record.effortScore,2);
buttons(tree)[1].props.onAdjust(-1);buttons(tree)[1].props.onAdjust(-1);tree=render();
assert.equal(progress.progressRows(draft).find(r=>r.record.content==='正一').record.effortScore,0);
const before=JSON.stringify(draft);disabled=true;tree=render();assert(buttons(tree).every(n=>n.props.disabled));buttons(tree)[0].props.onClick();tree=render();assert.equal(JSON.stringify(draft),before);assert.equal(editors(tree).find(n=>n.props.value==='负一').props.insertionSignal,2);
// Pure scores also use the real component callbacks, without implicitly revealing rows.
slots.length=0;draft=progress.newProgressDraft('other');disabled=false;tree=render();
const scoreOnly=buttons(tree)[1];scoreOnly.props.onAdjust(1);scoreOnly.props.onAdjust(1);tree=render();
assert.equal(draft.positive.effortScore,2);assert.equal(progress.hasProgressContent(draft),true);assert.equal(editors(tree).length,2);
buttons(tree)[1].props.onAdjust(-1);buttons(tree)[1].props.onAdjust(-1);tree=render();assert.equal(progress.hasProgressContent(draft),false);assert.equal(editors(tree).length,2);
console.log('PASS real ProgressEditorFields: per-row actions, rapid score changes, exact stable IDs, opposite/older focus isolation, plain hints, disabled no-op; async image completion belongs to task five.');
