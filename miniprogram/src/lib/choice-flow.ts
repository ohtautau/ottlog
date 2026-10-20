import { choiceCustomLimit, choiceQuestions } from './choice-data';

export type ChoiceDraft = { answers: string[]; step: number; customAnswer: string };
export const emptyChoiceDraft: ChoiceDraft = { answers: [], step: 0, customAnswer: '' };

export function normalizeChoiceDraft(value: unknown): ChoiceDraft {
  if (!value || typeof value !== 'object') return emptyChoiceDraft;
  const source = value as Partial<ChoiceDraft>;
  const customAnswer = typeof source.customAnswer === 'string' ? source.customAnswer.replace(/\s+/g, ' ').trim().slice(0, choiceCustomLimit) : '';
  const answers: string[] = [];
  for (let index = 0; index < choiceQuestions.length; index += 1) {
    const id = Array.isArray(source.answers) ? source.answers[index] : undefined;
    const option = choiceQuestions[index].options.find(item => item.id === id);
    if (!option || (option.custom && !customAnswer)) break;
    answers.push(option.id);
  }
  const step = typeof source.step === 'number' && Number.isFinite(source.step) ? Math.max(0, Math.min(answers.length, Math.floor(source.step))) : answers.length;
  return { answers, step, customAnswer };
}

/** Going back and choosing the same answer retains reachable later answers. */
export function answerChoice(draft: ChoiceDraft, id: string, text?: string): ChoiceDraft {
  const option = choiceQuestions[draft.step]?.options.find(item => item.id === id);
  if (!option) return draft;
  const custom = text?.replace(/\s+/g, ' ').trim();
  if (option.custom && (!custom || custom.length > choiceCustomLimit)) return draft;
  const answers = draft.answers[draft.step] === id ? draft.answers : [...draft.answers.slice(0, draft.step), id];
  return { answers, step: draft.step + 1, customAnswer: option.custom ? custom! : draft.customAnswer };
}
