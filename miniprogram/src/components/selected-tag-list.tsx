import { View } from '@tarojs/components';
import ActionButton from './ui-button';
import './selected-tag-list.css';

/** Selected labels remain visible when their picker is closed. */
export default function SelectedTagList({ tags, disabled = false, onEdit }: {
  tags: readonly string[]; disabled?: boolean; onEdit?: () => void;
}) {
  if (!tags.length) return null;
  return <View className='selected-tag-list' role='group' ariaLabel='已选标签'>
    {tags.map(tag => <ActionButton key={tag} appearance='quiet' size='compact' className='selected-tag-chip' ariaLabel={`修改已选标签：${tag}`} disabled={disabled || !onEdit} onClick={onEdit}>{tag}</ActionButton>)}
  </View>;
}
