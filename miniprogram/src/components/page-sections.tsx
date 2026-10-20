import type { ReactNode } from 'react';
import { View } from '@tarojs/components';
import ActionButton from './ui-button';
import { usePageScroll } from './page-scroll';
import BackButton from './back-button';
import './page-sections.css';

export function CoreScreen({ children, className = '', id = 'page-core', previousTarget, previousLabel = '返回上一页' }: { children: ReactNode; moreLabel?: string; className?: string; id?: string; previousTarget?: string; previousLabel?: string; nextTarget?: string; nextLabel?: string }) {
  const scrollTo = usePageScroll();
  return <View id={id} className={`core-screen ${className}`}>
    {previousTarget && <BackButton className='screen-return-hint' ariaLabel={previousLabel} onClick={() => scrollTo(previousTarget)} />}
    <View className='core-content'>{children}</View>
  </View>;
}

export function MoreSection({ children, title, actions, returnTarget = 'page-core', returnLabel = '返回第一页', showReturn = true }: { children: ReactNode; title?: string; actions?: ReactNode; returnTarget?: string; returnLabel?: string; showReturn?: boolean }) {
  const scrollTo = usePageScroll();
  return <View id='page-more' className='more-section'>{showReturn && <BackButton className='screen-return-hint' ariaLabel={returnLabel} onClick={() => scrollTo(returnTarget)} />}{title && (actions != null ? <View className='more-section-heading'><View className='more-section-title'>{title}</View>{actions}</View> : <View className='more-section-title'>{title}</View>)}{children}</View>;
}

export function PageJump({ children, target = 'page-more', className = '', ariaLabel, onClick }: { children: ReactNode; target?: string; className?: string; ariaLabel?: string; onClick?: () => void }) {
  const scrollTo = usePageScroll();
  return <ActionButton className={`button-label ${className}`} ariaLabel={ariaLabel} onClick={() => { onClick?.(); scrollTo(target); }}>{children}</ActionButton>;
}
