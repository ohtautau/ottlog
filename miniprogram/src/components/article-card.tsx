import { trimTextEnd } from '../lib/text-whitespace';
import { showAppMessage } from '../lib/app-dialog';
import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Image, Button } from '@tarojs/components';
import ActionButton from './ui-button';
import { imageUrl, type Post } from '../api';
import { POST_FILTER_STORAGE_KEY, type PostFilterLink } from '../lib/post-filter';
import { tagLabel } from '../lib/tag-label';
import './article-card.css';

export function openPostFilter(filter: PostFilterLink) {
  Taro.setStorageSync(POST_FILTER_STORAGE_KEY, filter);
  return Taro.navigateTo({ url: '/pages/posts/index' }).catch(() => {
    showAppMessage({ title: '暂时无法打开文章列表', icon: 'none' });
  });
}

export default function ArticleCard({ post, onCategory, onTag, featured = false }: {
  post: Post; onCategory?: (category: string) => void; onTag?: (tag: string) => void; featured?: boolean;
}) {
  const [failedImage, setFailedImage] = useState(false);
  useEffect(() => setFailedImage(false), [post.coverUrl]);
  const open = () => Taro.navigateTo({ url: `/pages/detail/index?slug=${encodeURIComponent(post.slug)}` }).catch(() => {
    showAppMessage({ title: '暂时无法打开文章', icon: 'none' });
  });
  const date = /^\d{4}-\d{2}-\d{2}/.test(post.date) ? post.date.slice(0, 10) : post.date;
  return <View className={`article-card${featured ? ' article-card-featured' : ''}`}>
    <View className='article-cover' onClick={open} ariaLabel={`阅读${post.title}`}>
      {post.coverUrl && !failedImage
        ? <Image className='article-image' src={imageUrl(post.coverUrl)} mode='aspectFill' lazyLoad={!featured} onError={() => setFailedImage(true)} />
        : <View className='article-cover-fallback'><Text className='article-cover-monogram'>τ</Text><Text>OTTLOG / {post.category}</Text></View>}
      {featured && <Text className='article-latest'>● 最新记录</Text>}
    </View>
    <View className='article-body'>
      <View className='article-meta'>
        <ActionButton appearance='quiet' className="button-label article-category" onClick={() => onCategory ? onCategory(post.category) : void openPostFilter({ category: post.category })}>{post.category}</ActionButton>
        <Text className='article-reading'>{post.minutes} 分钟阅读</Text>
      </View>
      <View className='article-title' onClick={open}>{trimTextEnd(post.title)}</View>
      {post.description && <View className='article-description' onClick={open}>{trimTextEnd(post.description)}</View>}
      {post.tags.length > 0 && <View className='article-tags'>{post.tags.map(tag => <Button key={tag} className='article-tag' onClick={() => onTag ? onTag(tag) : void openPostFilter({ tag })}><Text className='article-hash'>#</Text>{tagLabel(tag).slice(1)}</Button>)}</View>}
      <View className='article-footer'><Text className='article-date'>{date.replace(/-/g, '.')}</Text><ActionButton appearance='quiet' className="button-label article-read" onClick={open}>阅读全文</ActionButton></View>
    </View>
  </View>;
}
