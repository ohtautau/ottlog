import type { ReactNode } from 'react';
import {ScrollView,View} from '@tarojs/components';
import {ChoiceButton} from './ui-button';
import './choice-shortcut-rail.css';
/** Shared horizontal shortcut choices; option identity and semantics belong to the host. */
export default function ChoiceShortcutRail({leading,label,options,value,onChange,disabled=false}:{leading?:ReactNode;label:string;options:readonly {value:string;label:string;ariaLabel?:string;disabled?:boolean}[];value:string;onChange:(value:string)=>void;disabled?:boolean}){
 return <View className='choice-shortcut-row'>{leading && <View className='choice-shortcut-leading'>{leading}</View>}<ScrollView scrollX showScrollbar={false} className='choice-shortcut-rail' enhanced bounces={false} ariaLabel={label}><View className='choice-shortcut-track'>{options.map(option=><ChoiceButton key={option.value} variant='category' ariaLabel={option.ariaLabel||option.label} selected={option.value===value} disabled={disabled||option.disabled} onClick={()=>onChange(option.value)}>{option.label}</ChoiceButton>)}</View></ScrollView></View>;
}
