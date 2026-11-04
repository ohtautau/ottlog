import { showAppMessage } from '../lib/app-dialog';
import { TagChoiceRow } from './form-options';
import TagTextInput from './tag-text-input';
import { parseTodoTags } from '../lib/todo-data';
export default function EditorTagField({text,onChange,options,disabled,label,className}:{text:string;onChange:(text:string)=>void;options:readonly string[];disabled:boolean;label:string;className?:string}) {
 const selected=parseTodoTags(text);
 return <TagChoiceRow className={className} customInputPlacement='inline' options={[...new Set([...options,...selected])].map(value=>({value,label:value}))} value={selected} frequentValues={options.slice(0,4)} onChange={tags=>{if(tags.length>5){void showAppMessage({title:'最多 5 个标签',icon:'none'});return;}onChange(tags.join('，'));}} ariaLabel='选择现有标签' disabled={disabled} contentKey={text} customInput={<TagTextInput ariaLabel={label} value={text} placeholder='输入标签，用符号分隔' maxlength={Math.max(300,text.length)} cursorSpacing={96} adjustPosition disabled={disabled} onInput={event=>onChange(event.detail.value)} />} />;
}
