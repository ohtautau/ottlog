// Render the real signed editor with deterministic React hooks, no API/storage.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const cache=new Map(),slots=[];let cursor=0;
const react={createElement:(type,props,...children)=>({type,props:{...props,children:children.flat()}}),useRef:value=>{const i=cursor++;return slots[i]??(slots[i]={current:value});},useState:value=>{const i=cursor++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return [slots[i],next=>slots[i]=typeof next==='function'?next(slots[i]):next];},useEffect:()=>{}};
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React}}).outputText;new Function('React','module','exports','require',output)(react,module,module.exports,dep=>{if(dep==='react')return react;if(dep==='@tarojs/components')return {View:'View',Text:'Text'};if(dep.endsWith('.css'))return {};if(file.includes('/components/')&&!dep.startsWith('../lib/')&&dep!=='./editor-copy')return {default:dep,TaskAttachmentSymbol:'clip'};return load(path.resolve(path.dirname(file),dep+'.ts'));});return module.exports;}
const progress=load(path.resolve(__dirname,'../src/lib/progress-draft.ts'));
const component=load(path.resolve(__dirname,'../src/components/progress-editor-fields.tsx')).default;
let draft=progress.newProgressDraft('other'),disabled=false;
const render=()=>{cursor=0;return component({draft,state:{version:1,domains:[],completedGoals:[]},disabled,owner:'isolated',onBusyChange:()=>{},onChange:next=>draft=next});};
const all=(node,predicate)=>{if(!node||typeof node!=='object')return [];return [...(predicate(node)?[node]:[]),...(node.props?.children||[]).flatMap(child=>all(child,predicate))];};
const editors=tree=>all(tree,n=>n.type==='./markdown-note-editor');
const buttons=tree=>all(tree,n=>n.props?.ariaLabel?.endsWith('记录附件'));
let tree=render();assert.equal(buttons(tree).length,2);
const negative=editors(tree)[0],positive=editors(tree)[1];
assert.equal(negative.props.placeholder,'记录内容');assert.equal(positive.props.format,'plain');
// Empty column targets its own trailing input; click itself creates no data.
buttons(tree)[0].props.onClick();tree=render();assert.equal(editors(tree)[0].props.insertionSignal,1);assert.equal(editors(tree)[1].props.insertionSignal,0);assert.equal(progress.hasProgressContent(draft),false);
// Fill two positives and one negative. A focus on an old/opposite row must not retarget.
positive.props.onChange('正一');tree=render();let fields=editors(tree);fields.find(n=>n.props.value===''&&n.props.recordId!==negative.props.recordId).props.onChange('正二');tree=render();editors(tree).find(n=>n.props.recordId===negative.props.recordId).props.onChange('负一');tree=render();
const older=editors(tree).find(n=>n.props.value==='正一');older.props.onFocus();tree=render();buttons(tree)[1].props.onClick();tree=render();
assert.equal(editors(tree).find(n=>n.props.value==='正二').props.insertionSignal,1);assert.equal(editors(tree).find(n=>n.props.value==='正一').props.insertionSignal,0);
buttons(tree)[0].props.onClick();tree=render();assert.equal(editors(tree).find(n=>n.props.value==='负一').props.insertionSignal,2);
assert.equal(editors(tree).find(n=>n.props.value==='正二').props.insertionSignal,1);
const before=JSON.stringify(draft);disabled=true;tree=render();assert(buttons(tree).every(n=>n.props.disabled));buttons(tree)[0].props.onClick();tree=render();assert.equal(JSON.stringify(draft),before);assert.equal(editors(tree).find(n=>n.props.value==='负一').props.insertionSignal,2);
console.log('PASS real ProgressEditorFields: two column tools, empty targets, last valid stable IDs, opposite/older focus isolation, plain hints, disabled no-op; async image completion belongs to task five.');
