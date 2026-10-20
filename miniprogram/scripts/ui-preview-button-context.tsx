// Browser-only layouts of production controls; no account or tool-state writes.
import { useState } from 'react';
import { Text, View } from '@tarojs/components';
import ActionButton, { ChoiceButton } from '../src/components/ui-button';
import CreateButton from '../src/components/create-button';
import BackButton from '../src/components/back-button';
import SelectTrigger from '../src/components/select-trigger';
import SingleLineInput from '../src/components/single-line-input';

const rowStyle = { display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap' as const, gap: '8px', marginBottom: '12px' };

export default function ButtonContextFixture() {
  const [narrow, setNarrow] = useState(true), [disabled, setDisabled] = useState(false), [count, setCount] = useState(0);
  const [minutes, setMinutes] = useState('0');
  const click = () => setCount(previous => previous + 1);
  return <View data-button-fixture style={{ height: '100%', overflow: 'auto', boxSizing: 'border-box', padding: '16px' }}>
    <Text style={{ display: 'block', marginBottom: '8px' }}>同尺寸的不同层级</Text>
    <View data-button-case='levels' style={rowStyle}>
      <ActionButton appearance='primary' size='compact'>操作</ActionButton>
      <ActionButton appearance='secondary' size='compact'>操作</ActionButton>
      <ActionButton appearance='quiet' size='compact'>操作</ActionButton>
      <ActionButton appearance='secondary' intent='danger' size='compact'>操作</ActionButton>
    </View>
    <Text style={{ display: 'block', marginBottom: '8px' }}>同层级的不同尺寸</Text>
    <View data-button-case='sizes' style={rowStyle}>
      <ActionButton appearance='secondary' size='compact'>操作</ActionButton>
      <ActionButton appearance='secondary' size='regular'>操作</ActionButton>
      <ActionButton appearance='secondary' size='large'>操作</ActionButton>
      <ActionButton appearance='primary' compact size='regular'>操作</ActionButton>
    </View>
    <View data-button-case='dynamic' style={{ width: narrow ? '120px' : 'min(320px, 100%)', marginBottom: '12px' }}>
      <ActionButton appearance='secondary' size='regular' width='content' className='fixture-content'>操作</ActionButton>
      <ActionButton appearance='secondary' size='regular' width='fill' className='fixture-fill'>操作</ActionButton>
      <ActionButton appearance='primary' size='regular' width='fill' className='fixture-long'>保存当前记录并返回领域详情继续查看完整内容</ActionButton>
    </View>
    <ActionButton size='compact' ariaLabel='切换按钮容器宽度' onClick={() => setNarrow(previous => !previous)}>切换容器</ActionButton>
    <View data-button-case='wrappers' style={{ ...rowStyle, marginTop: '12px' }}>
      <View style={{ width: '160px' }}><CreateButton label='创建任务' size='regular' width='fill' /></View>
      <View style={{ width: '160px' }}><BackButton size='large' width='fill' /></View>
      <View style={{ width: '160px' }}><SelectTrigger label='选择日期' size='large' width='fill' /></View>
      <ChoiceButton size='regular' width='content'>选项</ChoiceButton>
    </View>
    <View data-button-case='intent' style={rowStyle}>
      <ActionButton appearance='quiet' intent='danger' size='compact' disabled={disabled} ariaLabel='移除示例内容' onClick={click}>移除</ActionButton>
      <ActionButton appearance='quiet' size='compact' ariaLabel='普通轻量动作'>编辑</ActionButton>
    </View>
    <View data-button-case='overlay' style={rowStyle}>
      {['#ffffff', '#101923'].map(background => <View key={background} data-image-background={background} style={{ position: 'relative', width: '100px', height: '80px', backgroundColor: background }}>
        <ActionButton appearance='icon' context='overlay' size='compact' disabled={disabled} ariaLabel={`移除${background}图片`} onClick={click} style={{ position: 'absolute', top: '4px', right: '4px' }}>×</ActionButton>
      </View>)}
    </View>
    <ActionButton size='compact' ariaLabel='切换示例禁用状态' onClick={() => setDisabled(previous => !previous)}>切换禁用</ActionButton>
    <View data-input-case='native-lines' style={{ ...rowStyle, marginTop: '12px' }}>
      {(['compact', 'regular'] as const).map(size => <SingleLineInput key={size} size={size} frameClassName={`fixture-input-${size}`} ariaLabel={`示例${size}分钟`} type='number' value={minutes} disabled={disabled}
        style={{ height: '80px', padding: '20px', lineHeight: '48px' }} onInput={event => setMinutes(event.detail.value)} />)}
    </View>
    <Text data-button-click-count style={{ display: 'block', marginTop: '8px' }}>已执行 {count} 次</Text>
  </View>;
}
