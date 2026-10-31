import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { ScrollView, View } from '@tarojs/components';
import CardGroupContent from './card-group-content';
import './habit-list-section.css';

/** A fixed heading with an independent vertical list; hosts own the selection. */
export default function HabitListSection({ heading, children, className = '', contentClassName = '', scrollProps = {}, timePeriod, scrollKey, edgeFade = false }: {
  heading: ReactNode; children: ReactNode; className?: string; contentClassName?: string;
  scrollProps?: ComponentProps<typeof ScrollView>; timePeriod?: string; scrollKey?: string; edgeFade?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { setScrolled(false); }, [scrollKey, edgeFade]);
  return <View className={`habit-list-section ${className}`} data-time-period={timePeriod}>
    <HabitListHeading>{heading}</HabitListHeading>
    <View className={`habit-list-section-viewport${edgeFade ? ' has-edge-fade' : ''}`}>
      <ScrollView key={scrollKey} scrollY enhanced bounces={false} {...scrollProps} scrollX={false} showScrollbar={false} className={`habit-list-section-scroll ${scrollProps.className || ''}`} onScroll={event => { setScrolled(event.detail.scrollTop > 1); scrollProps.onScroll?.(event); }}>
        <CardGroupContent className={`habit-list-section-content ${contentClassName}`}>{children}</CardGroupContent>
      </ScrollView>
      {edgeFade && scrolled && <View className='habit-list-section-edge is-top' aria-hidden />}
      {edgeFade && <View className='habit-list-section-edge' aria-hidden />}
    </View>
  </View>;
}

export function HabitListHeading({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`habit-list-section-heading card-group-heading ${className}`}>{children}</View>;
}
