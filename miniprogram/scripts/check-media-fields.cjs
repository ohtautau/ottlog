// Extend the existing real-component hook harness without changing task-four tests.
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/check-editor-polish.cjs','utf8');
const extra=`
// Two rows in each column; parent becomes interaction-locked by this operation.
disabled=false;tree=render();editors(tree).find(n=>n.props.value==='负一').props.onConfirm();tree=render();
let spareNegative=editors(tree).find(n=>n.props.value===''&&n.props.recordId!==draft.positive.id&&n.props.recordId!==editors(tree).find(x=>x.props.value==='正二').props.recordId);
spareNegative.props.onChange('负二');tree=render();
const oldPositiveId=editors(tree).find(n=>n.props.value==='正一').props.recordId;
const oldNegativeId=editors(tree).find(n=>n.props.value==='负一').props.recordId;
buttons(tree)[1].props.onClick();tree=render();
assert.equal(editors(tree).find(n=>n.props.value==='负二').props.insertionSignal,1);
disabled=true;mediaWritable=true;tree=render();
const target=editors(tree).find(n=>n.props.value==='负二');assert.equal(target.props.canInsertImage,true);
target.props.onImagesChange([{id:'alpha',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAAA'}]);tree=render();
assert.equal(progress.progressRows(draft).find(r=>r.record.content==='负二').record.images[0].id,'alpha');
assert.equal(progress.progressRows(draft).find(r=>r.record.id===oldPositiveId).record.images?.length||0,0);
assert.equal(progress.progressRows(draft).find(r=>r.record.id===oldNegativeId).record.images?.length||0,0);
const snapshot=JSON.stringify(draft);target.props.onChange('blocked ordinary input');assert.equal(JSON.stringify(draft),snapshot);
mediaWritable=false;tree=render();editors(tree).find(n=>n.props.value==='负二').props.onImagesChange([]);assert.equal(JSON.stringify(draft),snapshot);
disabled=false;mediaWritable=undefined;tree=render();
`;
vm.runInNewContext(source.replace('let draft=','let mediaWritable;let draft=').replace('disabled,owner:', 'disabled,mediaWritable,owner:').replace('const before=JSON.stringify(draft);',extra+'const before=JSON.stringify(draft);'),{require,console,__dirname},{filename:__filename});
