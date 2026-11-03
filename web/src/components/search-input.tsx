import type { ComponentProps } from 'react';
import '../../public/tool-app/search-symbol.css';

/** The website search uses the same magnifier geometry as the shared tools. */
export default function SearchInput(props: ComponentProps<'input'>) {
  return <div className='web-search-input'><span className='search-symbol' aria-hidden='true' /><input {...props} type='search' /></div>;
}
