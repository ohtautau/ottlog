import { View } from '@tarojs/components';
import ActionButton from './ui-button';
import './editor-preview-button.css';

/** The same Markdown mode control is used by task and note editors. */
export default function EditorPreviewButton({ selected, onChange, disabled, label = 'Markdown 预览' }: { selected:boolean;onChange:(value:boolean)=>void;disabled?:boolean;label?:string }) {
  return <ActionButton appearance='icon' size='compact' className={`editor-preview-toggle${selected ? ' is-selected' : ''}`} ariaLabel={label} aria-pressed={selected} disabled={disabled} onClick={() => onChange(!selected)}><View className='editor-preview-symbol' aria-hidden><View /></View></ActionButton>;
}
