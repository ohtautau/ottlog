// Browser-only examples of the production TagChoiceRow; no tool data or writes.
import { useState } from 'react';
import { Button, Text, View } from '@tarojs/components';
import { TagChoiceRow } from '../src/components/form-options';
import TagTextInput from '../src/components/tag-text-input';

const shortTags = ['工作', '学习', '生活', '购物'];
const longTags = ['一个很长的常用工作标签', 'LongProjectNameWithoutSpaces', '旅行与日常生活的观察记录', '需要保留完整名称的学习标签'];
const manyTags = Array.from({ length: 12 }, (_, index) => `标签${index + 1}`);

export default function TagRowFixture() {
  const [values, setValues] = useState<Record<string, string[]>>({ count: manyTags });
  const [dynamic, setDynamic] = useState(false);
  const [customTags, setCustomTags] = useState('购物，阅读，创作，示例');
  const examples = [
    { id: 'empty', label: '无常用标签', tags: [] },
    { id: 'one', label: '一个常用标签', tags: ['生活'] },
    { id: 'short', label: '四个短标签', tags: shortTags },
    { id: 'long', label: '四个长标签', tags: longTags },
    { id: 'count', label: '两位数选择数量', tags: manyTags },
    { id: 'dynamic', label: '动态常用标签', tags: dynamic ? longTags : ['工作'] },
  ];
  return <View style={{ padding: '16px' }}>
    {examples.map(example => <View key={example.id} data-tag-case={example.id} style={{ marginBottom: '12px' }}>
      <Text style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>{example.label}</Text>
      <TagChoiceRow options={example.tags.map(tag => ({ value: tag, label: tag }))} value={values[example.id] || []} onChange={value => setValues(previous => ({ ...previous, [example.id]: value }))} ariaLabel={`选择${example.label}`} />
    </View>)}
    <Button onClick={() => setDynamic(previous => !previous)}>切换常用标签</Button>
    <View data-tag-case='wrap' className='todo-sheet memo-editor-fields' style={{ position: 'relative', height: 'auto', maxHeight: 'none' }}>
      <TagChoiceRow options={shortTags.map(tag => ({ value: tag, label: tag }))} value={customTags.split('，')} onChange={value => setCustomTags(value.join('，'))}
        ariaLabel='选择换行标签' contentKey={customTags} customInput={<TagTextInput ariaLabel='换行标签文字' value={customTags} maxlength={300} onInput={event => setCustomTags(event.detail.value)} />} />
    </View>
  </View>;
}
