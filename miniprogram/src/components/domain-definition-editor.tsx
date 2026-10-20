import { Text, View } from '@tarojs/components';
import type { DomainDefinitionController } from '../lib/use-domain-definition';
import { MAX_DOMAIN_NAME_LENGTH } from '../lib/domain-data';
import ActionButton from './ui-button';
import EntityTitleRow, { EntityTitleInput } from './entity-title-field';
import LibraryIcon from './library-icon';
import IconLibrarySheet from './icon-library-sheet';
import SheetActions from './sheet-actions';
import EditorHeading from './editor-heading';
import EditorFieldsLayout from './editor-fields-layout';
import SheetBackdrop from './sheet-backdrop';
import AppDialog from './app-dialog';
import './domain-definition-editor.css';

/** The same definition editor and deletion confirmation serve list and detail. */
export default function DomainDefinitionEditor({ controller }: { controller: DomainDefinitionController }) {
  const { currentEditor: editor, currentDelete: deleting, iconOpen, blocked, busy, error } = controller;
  return <>
    {controller.closeDialog}
    {editor && <View className='domain-definition-root'>
      <View className='domain-definition-overlay'>
        <SheetBackdrop disabled={blocked} onClose={controller.close} />
        <View className='domain-definition-panel domain-definition-sheet' role='dialog' ariaLabel={editor.id ? '编辑领域' : '创建领域'}>
          <EditorHeading className='domain-definition-heading' title={editor.id ? '编辑领域' : '创建领域'} actions={<ActionButton appearance='icon' size='compact' ariaLabel='关闭编辑' disabled={blocked} onClick={controller.close}>×</ActionButton>} />
          <EditorFieldsLayout className='domain-definition-content'>
            <EntityTitleRow className='domain-definition-title-row'><ActionButton className='domain-definition-icon domain-icon-button' appearance='icon' size='compact' ariaLabel='选择领域图标' disabled={blocked} onClick={controller.openIcons}><LibraryIcon name={editor.iconId} /></ActionButton>
            <EntityTitleInput className='domain-name-field' ariaLabel='领域名称' placeholder='领域名称' value={editor.name} maxlength={MAX_DOMAIN_NAME_LENGTH} focus={!iconOpen} disabled={blocked} confirmType='done' cursorSpacing={100} onInput={event => controller.setName(event.detail.value)} onConfirm={() => { void controller.save(); }} /></EntityTitleRow>
          </EditorFieldsLayout>
          {!!error && <View className='domain-definition-error domain-error' role='alert'>{error}</View>}
          <SheetActions className='domain-definition-actions'><ActionButton appearance='primary' size='large' width='fill' loading={busy} disabled={blocked || !editor.name.trim()} onClick={() => { void controller.save(); }}>{editor.id ? '保存' : '创建领域'}</ActionButton></SheetActions>
        </View>
      </View>
    </View>}
    {editor && iconOpen && <IconLibrarySheet selectedId={editor.iconId} onClose={controller.closeIcons} onSelect={id => { if (id) controller.setIcon(id); else controller.closeIcons(); }} />}
    {deleting && <AppDialog title='删除领域' closeLabel='关闭删除确认' onClose={controller.closeDelete} busy={blocked} error={error} panelClassName='domain-delete-sheet' actions={<ActionButton appearance='danger' size='large' width='fill' disabled={blocked} loading={busy} onClick={() => { void controller.confirmDelete(); }}>删除</ActionButton>}><Text>删除「{deleting.name}」及其目标和进展记录？共享习惯保留为未分类。</Text></AppDialog>}
  </>;
}
