import type { Metadata } from 'next';
import ChoiceExperience from './choice-experience';

export const metadata: Metadata = {
  title: '选境',
  description: '九次选择，让直觉在屏幕上留下形状，再留一句自己的话。',
};

export default function ChoosePage() { return <ChoiceExperience />; }
