import { trimTextEnd } from '../../lib/text-whitespace';
import SheetActions from '../../components/sheet-actions';
import SectionTitle from '../../components/section-title';
import EditorHeading from '../../components/editor-heading';
import useEditorCloseGuard from '../../lib/use-editor-close-guard';
import { requestAppConfirmation } from '../../lib/app-dialog';
import { AppDialogHost } from '../../components/app-dialog';
import { CoreScreen, MoreSection } from '../../components/page-sections';
import { useEffect, useState } from 'react';
import { Button, Text, Textarea, View } from '@tarojs/components';
import ActionButton from '../../components/ui-button';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import PageScroll from '../../components/page-scroll';
import ChoiceField, { ChoiceProgress, choiceSurfaces } from '../../lib/choice-field';
import { choiceCustomLimit, choiceQuestions, deriveChoiceResult } from '../../lib/choice-data';
import { answerChoice, emptyChoiceDraft, normalizeChoiceDraft, type ChoiceDraft } from '../../lib/choice-flow';
import './index.css';

const draftKey = 'ottlog.choice.draft.v1';
export default function ChoosePage() {
  const [draft, setDraft] = useState<ChoiceDraft>(() => {
    try { return normalizeChoiceDraft(Taro.getStorageSync(draftKey)); } catch { return emptyChoiceDraft; }
  });
  const [customOpen, setCustomOpen] = useState(false), [customText, setCustomText] = useState(draft.customAnswer);
  const [message, setMessage] = useState('');
  const total = choiceQuestions.length, complete = draft.step === total;
  const question = choiceQuestions[Math.min(draft.step, total - 1)];
  useShareAppMessage(() => ({ title: '九次直觉，一种此刻的形状 · 选境', path: '/pages/choose/index' }));
  useEffect(() => {
    try { Taro.setStorageSync(draftKey, draft); } catch { setMessage('暂时无法保留进度，仍可继续选择。'); }
  }, [draft]);
  function jump(step: number) { if (step >= 0 && step <= draft.answers.length) setDraft(previous => ({ ...previous, step })); }
  function choose(id: string) {
    if (question.options.find(option => option.id === id)?.custom) { setCustomText(draft.customAnswer); setCustomOpen(true); return; }
    setDraft(previous => answerChoice(previous, id));
  }
  function submitCustom() {
    const text = customText.replace(/\s+/g, ' ').trim();
    if (!text || text.length > choiceCustomLimit) return;
    const option = question.options.find(item => item.custom);
    if (option) setDraft(previous => answerChoice(previous, option.id, text));
    setCustomOpen(false);
  }
  async function restart() {
    if (draft.answers.length && !complete) {
      const confirmation = await requestAppConfirmation({ title: '从第一束光重新开始？', content: '这次已经选过的答案会清空。', confirmText: '重新开始' });
      if (!confirmation.confirm) return;
    }
    setDraft({ ...emptyChoiceDraft, answers: [] }); setCustomText(''); setMessage('');
  }
  const customClose = useEditorCloseGuard({
    scope: customOpen ? `choice:${draft.step}` : '',
    hasChanges: customText !== draft.customAnswer,
    onSave: submitCustom, onClose: () => setCustomOpen(false),
  });
  const progress = { completed: draft.step, total, furthest: draft.answers.length, onJump: jump };
  if (complete) {
    const result = deriveChoiceResult(draft.answers);
    const last = choiceQuestions[total - 1].options.find(option => option.id === draft.answers[total - 1]);
    return <PageScroll><View className='tool-page choice-result-page core-page'><CoreScreen moreLabel='解读与走过的九步'>
      <View className='tool-header'><Text className='tool-title'>这是，你选出的形状。</Text></View>
      <View className='choice-orbit'><View className='choice-orbit-ring' />{draft.answers.map((id, index) => {
        const selected = choiceQuestions[index].options.findIndex(option => option.id === id);
        return <View key={id} className='choice-orbit-arm' style={{ transform: `rotate(${index * 40}deg)` }}><View className='choice-orbit-tile' style={{ backgroundColor: choiceSurfaces[(selected + index * 2) % choiceSurfaces.length] }}><View /></View></View>;
      })}<View className='choice-orbit-center'><Text>09</Text><Text>此刻的你</Text></View></View>
      <View className='choice-core-result'><View>{trimTextEnd(result.title)}</View><Text>{trimTextEnd(result.description)}</Text></View>
      </CoreScreen><MoreSection>
      <View className='tool-card choice-result-card'><Text className='choice-result-title'>{trimTextEnd(result.title)}</Text><Text className='tool-muted'>{trimTextEnd(result.description)}</Text>
        <View className='choice-closing'><Text className='tool-kicker'>最终回答</Text><Text>{last?.custom ? draft.customAnswer : last?.label}</Text></View>
        <View className='tool-chips'>{result.keywords.map(word => <Text className='tool-chip is-active' key={word}>{word}</Text>)}</View>
        <View className='choice-scores'>{result.scores.map((score, index) => <View className='choice-score' key={result.labels[index]}><View className='tool-row'><Text>{result.labels[index]}</Text><Text>{score}</Text></View><View className='choice-score-track'><View style={{ width: `${score}%` }} /></View></View>)}</View>
        <Text className='tool-muted'>{result.explanation}</Text>
      </View>
      <View className='tool-section'><SectionTitle className='choice-trail-title'>走过的九步</SectionTitle><ChoiceProgress progress={progress} /><View className='choice-answer-trail'>{draft.answers.map((id, index) => {
        const option = choiceQuestions[index].options.find(item => item.id === id)!;
        return <Button className='choice-trail-button' key={id} onClick={() => jump(index)}><Text>{String(index + 1).padStart(2, '0')}</Text><Text>{option.custom ? draft.customAnswer : option.label}</Text><Text>↗</Text></Button>;
      })}</View></View>
      {message && <Text className='tool-status'>{message}</Text>}
      <ActionButton appearance='primary' className="button-label tool-primary" onClick={() => void restart()}>再走一条不同的路 ↻</ActionButton>
      <ActionButton className="button-label tool-secondary" onClick={() => void Taro.switchTab({ url: '/pages/index/index' })}>回到今日</ActionButton>
    </MoreSection></View></PageScroll>;
  }
  return <View><AppDialogHost /><ChoiceField aligned title={question.prompt} eyebrow='选境 / CHOICE FIELD' options={question.options} onChoose={choose} selected={draft.answers[draft.step]} stage={draft.step} progress={progress}
    onBack={draft.step > 0 ? () => jump(draft.step - 1) : undefined} onNext={draft.step < draft.answers.length ? () => jump(draft.step + 1) : undefined}
    footer={<><ActionButton className='button-label' onClick={() => void Taro.switchTab({ url: '/pages/index/index' })}>τ 今日</ActionButton>{message && <Text className='choice-footer-copy'>{message}</Text>}<ActionButton className='button-label' onClick={() => void restart()} disabled={!draft.answers.length}>重来 ↻</ActionButton></>} />
    {customOpen && <View className='choice-sheet-mask' onClick={customClose.requestClose}><View className='choice-sheet' onClick={event => event.stopPropagation()}>
      <EditorHeading embedded title='用自己的话。' actions={<ActionButton appearance='icon' ariaLabel='关闭自定义答案' onClick={customClose.requestClose}>×</ActionButton>} />
      <Textarea className='tool-input choice-custom-input' value={customText} focus maxlength={choiceCustomLimit} autoHeight={false} fixed cursorSpacing={96} adjustPosition placeholder='此刻，想留下一句什么？' onInput={event => setCustomText(event.detail.value)} />
      <Text className='choice-custom-count'>{customText.length} / {choiceCustomLimit}</Text><SheetActions className='tool-row choice-sheet-actions'><ActionButton appearance='primary' className="button-label tool-primary" disabled={!customText.trim()} onClick={submitCustom}>用这句话</ActionButton></SheetActions>
    </View></View>}
    {customClose.dialog}
  </View>;
}
