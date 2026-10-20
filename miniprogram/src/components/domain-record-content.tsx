import { showAppMessage } from '../lib/app-dialog';
import { useMemo } from 'react';
import { Image, RichText, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { imageUrl } from '../api';
import { createMarkdownRenderer } from '../lib/markdown';
import { previewMemoImages } from '../lib/memo-images';
import type { RecordItem } from '../lib/domain-data';
import { trimTextEnd } from '../lib/text-whitespace';
import './domain-record-content.css';

const renderers = new Map<string, ReturnType<typeof createMarkdownRenderer>>();
function renderer(inheritTypography: boolean, compact: boolean) {
  const key = `${inheritTypography}:${compact}`;
  let render = renderers.get(key);
  if (!render) { render = createMarkdownRenderer(imageUrl, { inheritTypography, compact }); renderers.set(key, render); }
  return render;
}
export default function DomainRecordContent({ record, inheritTypography = true, compact = false, className = '', format = 'markdown' }: { record: Pick<RecordItem, 'content' | 'images'>; inheritTypography?: boolean; compact?: boolean; className?: string; format?: 'markdown' | 'plain' }) {
  const content = trimTextEnd(record.content);
  const markdown = useMemo(() => format === 'markdown' ? renderer(inheritTypography, compact)(content) : '', [content, inheritTypography, compact, format]);
  return <View className={`domain-record-content ${className}`}>
    {!!content && (format === 'plain' ? <Text className='domain-record-plain' selectable>{content}</Text> : <RichText nodes={markdown} selectable style={{ fontSize: 'inherit', color: 'inherit' }} />)}
    {!!record.images?.length && <View className='domain-record-images'>{record.images.map((image, index) => <Image key={image.id} src={image.dataUrl} mode='aspectFill' ariaLabel={`记录图片 ${index + 1}`} onClick={event => { event.stopPropagation(); void previewMemoImages(record.images!, index).catch(error => { void showAppMessage({ title: error instanceof Error ? error.message : '图片暂不可用', icon: 'none' }); }); }} />)}</View>}
  </View>;
}
