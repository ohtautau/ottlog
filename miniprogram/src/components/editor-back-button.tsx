import type { ComponentProps } from 'react';
import ActionButton from './ui-button';
import BackSymbol from './back-symbol';
export default function EditorBackButton(props: Omit<ComponentProps<typeof ActionButton>, 'children'>) { return <ActionButton appearance='icon' {...props}><BackSymbol /></ActionButton>; }
