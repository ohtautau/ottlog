import { Image, View } from '@tarojs/components';
import { getLibraryIcon, iconLibrary } from '../lib/icon-library';
import './library-icon.css';

export default function LibraryIcon({ name, className = '', fallback = 'notes', variant = 'colored' }: { name?: string; className?: string; fallback?: string; variant?: 'colored' | 'outline' }) {
  const icon = getLibraryIcon(name) ?? getLibraryIcon(fallback) ?? getLibraryIcon('notes')!;
  if (variant === 'outline') {
    const index = iconLibrary.findIndex(candidate => candidate.id === icon.id);
    return <View className={`library-icon is-outline ${className}`} data-icon={icon.id} aria-hidden><Image className='library-icon-sheet' src='/assets/icons/outline-sheet.png' style={{ width: '800%', height: '800%', left: `${-(index % 8) * 100}%`, top: `${-Math.floor(index / 8) * 100}%` }} mode='scaleToFill' showMenuByLongpress={false} /></View>;
  }
  return <Image className={`library-icon ${className}`} src={icon.src} mode='aspectFit' showMenuByLongpress={false} />;
}
