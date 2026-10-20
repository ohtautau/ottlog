import { useEffect, useRef, useState } from 'react';
import Taro from '@tarojs/taro';
import { ScrollView, Text, View } from '@tarojs/components';
import ActionButton from './ui-button';
import HomeFeatureList from './home-feature-list';
import type { HomeFeatureGroup } from '../lib/home-feature-catalog';
import EntityTitleRow, { EntityTitleInput } from './entity-title-field';
import ColorChoiceRow from './color-choice-row';
import SheetActions from './sheet-actions';
import HomeShortcutCard from './home-shortcut-card';
import EditorHeading from './editor-heading';
import EditorFieldsLayout from './editor-fields-layout';
import useEditorCloseGuard from '../lib/use-editor-close-guard';
import ShortcutIcon from './shortcut-icon';
import ShortcutIconPicker from './shortcut-icon-picker';
import { defaultShortcutIcon } from '../lib/shortcut-icons';
import { groupHomeShortcuts as grouped, makeShortcut, nextHomeShortcutRank, normalizeHomeShortcuts, replaceHomeShortcut, shortcutCatalog, shortcutColors, type HomeShortcut, type HomeShortcuts, type ShortcutKey } from '../lib/home-shortcuts';
import './home-shortcut-editor.css';

/** Function selection and appearance share draft/save handling, with separate bodies. */
export default function HomeShortcutEditor({ value, initialKey, replacementKey, groups, onSave, onCancel }: {
  value: HomeShortcuts; initialKey?: ShortcutKey; replacementKey?: ShortcutKey;
  groups?: HomeFeatureGroup[];
  onSave: (value: HomeShortcuts, close?: boolean) => boolean; onCancel: () => void;
}) {
  const [items, setItems] = useState(() => grouped(value.items.map(item => ({ ...item }))));
  const [replacement, setReplacement] = useState<ShortcutKey | undefined>(replacementKey);
  const [iconOpen, setIconOpen] = useState(false);
  const [saveError, setSaveError] = useState('');
  const pending = useRef<HomeShortcuts | null>(null), latestItems = useRef(items);
  latestItems.current = items;
  const item = items.find(candidate => candidate.key === initialKey);
  const original = shortcutCatalog.find(candidate => candidate.key === initialKey);
  const title = initialKey ? '编辑快捷方式' : replacementKey ? '替换快捷方式' : '选择快捷方式';
  function savedValue(selected: HomeShortcut[]) {
    return normalizeHomeShortcuts({ version: 1, items: selected.map(candidate => ({ ...candidate, icon: candidate.icon || defaultShortcutIcon(candidate.key) })) });
  }
  function patch(key: ShortcutKey, change: Partial<HomeShortcut>) {
    if (pending.current) return;
    const next = grouped(latestItems.current.map(candidate => candidate.key === key ? { ...candidate, ...change } : candidate));
    latestItems.current = next; setItems(next);
  }
  function toggle(key: ShortcutKey) {
    setItems(previous => grouped(previous.some(candidate => candidate.key === key) ? previous.filter(candidate => candidate.key !== key) : [...previous, { ...(value.items.find(candidate => candidate.key === key) || makeShortcut(key)), rank: nextHomeShortcutRank(previous) }]));
  }
  function close() {
    if (iconOpen) { setIconOpen(false); return; }
    closeGuard.requestClose();
  }
  function openIconLibrary() { void Taro.hideKeyboard?.().catch(() => {}); setIconOpen(true); }
  function save() {
    const selected = replacementKey && replacement ? replaceHomeShortcut(items, replacementKey, replacement) : items;
    const target = pending.current || savedValue(selected);
    if (onSave(target)) { pending.current = null; setSaveError(''); return true; }
    if (initialKey) { pending.current = target; setSaveError('保存失败，修改已保留，请重试'); }
    return false;
  }
  const closeGuard = useEditorCloseGuard({ scope: `shortcuts:${initialKey || replacementKey || 'selection'}`, hasChanges: !!pending.current || (replacementKey ? replacement !== replacementKey : JSON.stringify(savedValue(items)) !== JSON.stringify(savedValue(value.items))), blocked: iconOpen, onSave: save, onClose: onCancel });
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault(); event.stopImmediatePropagation(); close();
    };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [iconOpen, closeGuard.requestClose]);
  return <View className='home-editor-overlay'>
    <View className='home-editor-backdrop' catchMove onClick={close} />
    <View className={'home-editor-sheet' + (initialKey ? ' is-single' : ' is-selector')} role='dialog' ariaLabel={title}>
      <EditorHeading className='home-editor-header' titleClassName='home-editor-title' title={title} actions={<ActionButton appearance='icon' size='compact' width='content' ariaLabel={initialKey ? '关闭快捷方式编辑' : '取消修改快捷方式'} onClick={close}>×</ActionButton>} />
      <ScrollView className='home-editor-scroll' scrollY enhanced bounces={false} showScrollbar={false}>
        <View className='home-editor-body'>
          {!initialKey && <HomeFeatureList variant='selection' groups={groups} className='home-editor-selection'
            optionState={option => {
              const chosen = items.find(candidate => candidate.key === option.key);
              return { selected: replacementKey ? replacement === option.key || !!chosen && option.key !== replacementKey : !!chosen,
                disabled: !!replacementKey && !!chosen && option.key !== replacementKey, rank: chosen?.rank,
                ariaLabel: replacementKey ? '替换为：' + option.name : (chosen ? '移除' : '添加') + '快捷方式：' + option.name };
            }} onChoose={option => replacementKey ? setReplacement(option.key) : toggle(option.key)} />}
          {initialKey && (item ? <EditorFieldsLayout topSpace={false} className='home-editor-fields'>
            <View className='home-editor-preview'><HomeShortcutCard item={{ ...item, name: item.name.trim() || original!.name }} /></View>
            <EntityTitleRow className='home-editor-name-row'>
              <ActionButton appearance='icon' size='compact' className='home-editor-icon-trigger' ariaLabel='选择快捷方式背景' aria-expanded={iconOpen} disabled={!!saveError} onClick={openIconLibrary}><ShortcutIcon name={item.key} icon={item.icon} /></ActionButton>
              <EntityTitleInput ariaLabel={'快捷方式名称：' + original!.name} value={item.name} maxlength={8} placeholder={original!.name} cursorSpacing={96} adjustPosition disabled={iconOpen || !!saveError} onInput={event => patch(item.key, { name: event.detail.value })} />
            </EntityTitleRow>
            <View className='home-editor-color-section'><ColorChoiceRow className='home-editor-colors' buttonClassName='home-editor-color' dotClassName='home-editor-color-dot' disabled={!!saveError} options={shortcutColors.map(color => ({ key: color.key, label: color.name, ariaLabel: '使用' + color.name + '色', dotClassName: 'shortcut-color-' + color.key }))} value={item.color} onChange={color => patch(item.key, { color })} /></View>
            {!!saveError && <View className='home-editor-save-error' role='alert'><Text>{saveError}</Text></View>}
          </EditorFieldsLayout> : <View className='home-editor-removed'><Text>已移除快捷方式</Text><ActionButton appearance='quiet' size='compact' width='fill' onClick={() => toggle(initialKey)}>恢复快捷方式</ActionButton></View>)}
        </View>
      </ScrollView>
      <SheetActions className='home-editor-footer'><ActionButton appearance='primary' size='large' width='fill' disabled={iconOpen} onClick={save}>保存快捷方式</ActionButton></SheetActions>
    </View>
    {iconOpen && item && <ShortcutIconPicker icon={item.icon} onSelect={icon => { patch(item.key, { icon }); setIconOpen(false); }} onCancel={() => setIconOpen(false)} />}
    {closeGuard.dialog}
  </View>;
}
