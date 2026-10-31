import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { clearMountHost, events, setMountHost } from './platform';
import './shell.css';
import useDialogFocus from './use-dialog-focus';
import useCategorySizing from './use-category-sizing';

class PageBoundary extends React.Component {
  state = { error: '' };
  static getDerivedStateFromError(error) { return { error: error.message }; }
  render() { return this.state.error ? <div className='browser-error' role='alert'>页面暂时无法打开。<p>{this.state.error}</p><button onClick={() => location.reload()}>重新打开</button></div> : this.props.children; }
}
function SharedPage({ Page }) {
  const [images, setImages] = useState(null), [notice, setNotice] = useState('');
  const imageRef = useRef(images); useLayoutEffect(() => { imageRef.current = images; }, [images]);
  useDialogFocus();
  useCategorySizing();
  useEffect(() => {
    const image = payload => setImages(payload), notify = text => setNotice(text);
    events.on('images', image); events.on('notice', notify);
    return () => { events.off('images', image); events.off('notice', notify); };
  }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 3500); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => {
    const escape = event => { if (event.key === 'Escape' && imageRef.current) { event.preventDefault(); event.stopImmediatePropagation(); setImages(null); } };
    window.addEventListener('keydown', escape, true); return () => window.removeEventListener('keydown', escape, true);
  }, []);
  return <><div className='shared-app-content'><PageBoundary><Page /></PageBoundary></div>
    {notice && <div className='browser-notice' role='status'>{notice}</div>}
    {images && <div className='browser-image-viewer' role='dialog' aria-modal='true' aria-label='查看图片' onClick={() => setImages(null)}><button autoFocus aria-label='关闭图片' onClick={() => setImages(null)}>×</button><img src={images.current || images.urls[0]} alt='内容图片' onClick={event => event.stopPropagation()} /><div>{images.urls.map(src => <button key={src} aria-label='选择预览图片' onClick={event => { event.stopPropagation(); setImages({ ...images, current: src }); }}><img src={src} alt='' /></button>)}</div></div>}
  </>;
}
export function registerTools(pages) {
  if (customElements.get('ottlog-tools')) return;
  customElements.define('ottlog-tools', class extends HTMLElement {
    connectedCallback() {
      queueMicrotask(() => {
        if (!this.isConnected || this.reactRoot) return;
        this.host = document.createElement('div'); this.host.className = 'tool-app-root'; this.appendChild(this.host);
        setMountHost(this.host, this.dataset.page || 'index', this.dataset.query || '');
        if (this.closest('[data-tool-layout=viewport]')) {
          this.observer = new ResizeObserver(([entry]) => {
            const height = Math.round(entry.contentRect.height);
            if (height && this.host.style.getPropertyValue('--app-page-height') !== `${height}px`) {
              this.host.style.setProperty('--app-page-height', `${height}px`);
              events.trigger('resize', { size: { windowWidth: innerWidth, windowHeight: innerHeight } });
            }
          });
          this.observer.observe(this);
        }
        const Page = pages[`pages/${this.dataset.page || 'index'}/index`];
        this.reactRoot = createRoot(this.host); this.reactRoot.render(<SharedPage Page={Page} />);
      });
    }
    disconnectedCallback() {
      queueMicrotask(() => { if (this.isConnected) return; this.observer?.disconnect(); this.reactRoot?.unmount(); clearMountHost(this.host); });
    }
  });
}
