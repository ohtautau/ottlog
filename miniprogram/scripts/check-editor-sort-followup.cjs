// Real shared component contracts; API-free deterministic element rendering.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const react={createElement:(type,props,...children)=>({type,props:{...props,children:children.flat()}})};
let guard;
function load(name){const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/components',name+'.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText,m={exports:{}};new Function('React','module','exports','require',code)(react,m,m.exports,dep=>dep==='react'?react:dep==='@tarojs/components'?{Text:'Text',View:'View'}:dep.endsWith('use-editor-close-guard')?{default:options=>{guard=options;return {requestClose:()=>options.onClose(),dialog:null};}}:dep.endsWith('.css')?{}:dep==='./form-options'?{ChoicePopover:'Popover',PopoverHeading:'Heading',PopoverActions:'Actions'}:{default:dep,ChoiceButton:'ChoiceButton'});return m.exports;}
const all=n=>!n||typeof n!=='object'?[]:[n,...(n.props?.children||[]).flatMap(all)];
const applied=load('applied-options').default;let cleared=0;
assert.equal(applied({items:[]}),null);assert.equal(all(applied({items:['filter']})).filter(n=>n.props?.onClick).length,0);
const tree=applied({items:['long search','sort'],onClear:()=>cleared++,disabled:true});const clear=all(tree).find(n=>n.props?.ariaLabel==='清除当前筛选和排序');assert.equal(clear.props.disabled,true);assert.equal(all(tree).find(n=>n.type==='Text').props.className,'applied-options-text');clear.props.onClick();assert.equal(cleared,1);
const {SortPopover}=load('sort-options');let closed=0,saved=0;
const props={ariaLabel:'排序夹具',open:true,onOpenChange:next=>{if(!next)closed++;},hasChanges:true,onConfirm:()=>saved++,children:'choices'};
let popover=SortPopover({...props,immediate:true}).props.children[0];assert.equal(popover.props.footer,false);assert.equal(guard.hasChanges,false);popover.props.onOpenChange(false);assert.equal(closed,1);assert.equal(saved,0);
SortPopover(props);assert.equal(guard.hasChanges,true,'manual callers retain guard');
const daily=fs.readFileSync(path.join(__dirname,'../src/pages/daily/index.tsx'),'utf8');assert(!daily.includes('grouped && <HabitListSection'));assert(!daily.includes('ToolbarResetButton'));assert(daily.includes('void persistSort({ owner, choice });'));assert(!daily.match(/function resetFilters\(\)[^\n]*setCoreGroup/));
console.log('PASS actual AppliedOptions optional clear/disabled and SortPopover immediate close without save, manual guard retained; habit wiring audit');
