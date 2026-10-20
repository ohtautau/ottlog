import { trimTextEnd } from '../lib/text-whitespace';
import { Text, View } from '@tarojs/components';
import { homeFeatureGroups, type HomeFeature, type HomeFeatureKey } from '../lib/home-feature-catalog';
import { CardMoveActions } from './card-corner-actions';
import SectionTitle from './section-title';
import ShortcutIcon from './shortcut-icon';
import ActionButton, { ChoiceButton } from './ui-button';
import './home-feature-list.css';

type OptionState = { selected?: boolean; disabled?: boolean; rank?: number; ariaLabel?: string };

/** Hosts own selection/navigation; both contexts share definitions and row geometry. */
export default function HomeFeatureList({ variant = 'navigation', disabled = false, className = '', groups = homeFeatureGroups, sorting = false, onMove, optionState, onChoose }: {
  variant?: 'navigation' | 'selection'; disabled?: boolean; className?: string;
  groups?: typeof homeFeatureGroups; sorting?: boolean; onMove?: (key: HomeFeatureKey, direction: -1 | 1) => void;
  optionState?: (feature: HomeFeature) => OptionState;
  onChoose: (feature: HomeFeature) => void;
}) {
  const moving = variant === 'navigation' && sorting;
  return <View className={`home-feature-list is-${variant}${moving ? ' is-sorting' : ''} ${className}`}>{groups.map(group => <View key={group.title} className='home-feature-group'>
    <SectionTitle className='home-feature-heading'>{trimTextEnd(group.title)}</SectionTitle>
    <View className='home-feature-grid'>{group.items.map((feature, index) => {
      const state = optionState?.(feature) ?? {};
      const children = <><ShortcutIcon name={feature.key} /><Text className='home-feature-name'>{trimTextEnd(feature.name)}</Text>
        {variant === 'selection' && state.rank ? <Text className='home-feature-rank' aria-hidden>{state.rank}</Text> : variant === 'navigation' && feature.type === 'page' ? <View className='home-feature-arrow' aria-hidden /> : null}</>;
      const props = { className: 'home-feature-option' + (variant === 'selection' ? ' home-editor-option' : ' today-all-tool'), size: 'compact' as const, width: 'fill' as const,
        disabled: disabled || state.disabled, 'data-feature-key': feature.key, 'data-feature-type': feature.type,
        ariaLabel: state.ariaLabel ?? (feature.type === 'action' ? `操作：${feature.name}` : `打开${feature.name}`), onClick: () => { if (!moving) onChoose(feature); } };
      return variant === 'selection' ? <ChoiceButton key={feature.key} {...props} selected={state.selected}>{children}</ChoiceButton> : <View key={feature.key} className='home-feature-entry' data-feature-key={feature.key}>
        <ActionButton {...props} appearance='secondary'>{children}</ActionButton>
        {moving && onMove && <CardMoveActions objectLabel={feature.name} disabled={disabled} upDisabled={index === 0} downDisabled={index === group.items.length - 1} onMoveUp={() => onMove(feature.key, -1)} onMoveDown={() => onMove(feature.key, 1)} />}
      </View>;
    })}</View>
  </View>)}</View>;
}
