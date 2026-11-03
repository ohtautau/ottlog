import type { ComponentProps } from 'react';
import SingleLineInput from './single-line-input';
import SearchSymbol from './search-symbol';

export default function SearchInput(props: Omit<ComponentProps<typeof SingleLineInput>, 'leading' | 'align'>) {
  return <SingleLineInput {...props} align='left' confirmType='search' leading={<SearchSymbol />} />;
}
