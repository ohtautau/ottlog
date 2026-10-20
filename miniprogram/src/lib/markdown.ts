import MarkdownIt from 'markdown-it';
import { trimTextEnd } from './text-whitespace';

/** RichText does not inherit browser stylesheet selectors consistently. Style each node. */
export function createMarkdownRenderer(resolveImage: (source: string) => string, { inheritTypography = false, compact = false }: { inheritTypography?: boolean; compact?: boolean } = {}) {
  const markdown = new MarkdownIt({ html: false, breaks: true, linkify: true, typographer: false });
  const textStyle = (style: string) => inheritTypography ? `${style}font-size:inherit;color:inherit;` : style;
  const styles: Record<string, string> = {
    paragraph_open: `margin:0 0 ${compact ? 4 : 18}px;line-height:${compact ? 1.65 : 1.95};word-wrap:break-word;`,
    blockquote_open: `margin:${compact ? 6 : 22}px 0;padding:${compact ? '6px 8px' : '14px 18px'};border-left:4px solid #91ccbc;background:#182b38;color:#d3e3e5;`,
    bullet_list_open: `padding-left:24px;margin:${compact ? '4px 0 6px' : '12px 0 20px'};`,
    ordered_list_open: `padding-left:26px;margin:${compact ? '4px 0 6px' : '12px 0 20px'};`,
    list_item_open: `margin:${compact ? 2 : 6}px 0;line-height:${compact ? 1.65 : 1.9};`,
    strong_open: 'font-weight:700;color:#f3eee4;',
    em_open: 'font-style:italic;color:#bed9ea;',
    s_open: 'text-decoration:line-through;color:#8c9aad;',
    link_open: 'color:#a9cdff;text-decoration:underline;word-break:break-all;',
    thead_open: 'background:#233a54;color:#f5f2e9;',
    th_open: `padding:${compact ? 6 : 10}px;border:1px solid #496079;text-align:left;font-weight:bold;`,
    td_open: `padding:${compact ? 6 : 10}px;border:1px solid #35495f;vertical-align:top;`,
  };
  Object.entries(styles).forEach(([rule, style]) => {
    const original = markdown.renderer.rules[rule];
    markdown.renderer.rules[rule] = (tokens, index, options, env, renderer) => {
      tokens[index].attrJoin('style', textStyle(style));
      return original ? original(tokens, index, options, env, renderer) : renderer.renderToken(tokens, index, options);
    };
  });
  markdown.renderer.rules.heading_open = (tokens, index, options, _env, renderer) => {
    const level = Number(tokens[index].tag.slice(1));
    const size = [30, 27, 23, 20, 18, 17][level - 1] || 20;
    tokens[index].attrSet('style', textStyle(`font-size:${size}px;font-weight:800;line-height:1.5;margin:${compact ? '8px 0 4px' : '30px 0 14px'};color:#f3eee4;`));
    return renderer.renderToken(tokens, index, options);
  };
  markdown.renderer.rules.code_inline = (tokens, index) => `<code style="${textStyle(`padding:2px 5px;background:#21364c;color:#acd8ce;font-family:monospace;font-size:0.9em;word-break:break-word;${compact ? 'white-space:pre-wrap;' : ''}`)}">${markdown.utils.escapeHtml(tokens[index].content)}</code>`;
  const codeBlock = (content: string, language = '') => `<div style="margin:${compact ? 6 : 22}px 0;background:#0b1522;border:1px solid #334a61;padding:${compact ? 8 : 16}px;">${language ? `<div style="${textStyle(`font-family:monospace;font-size:11px;color:#92b2d6;margin-bottom:${compact ? 4 : 10}px;`)}">${markdown.utils.escapeHtml(language)}</div>` : ''}<pre style="${textStyle(`margin:0;font-size:13px;line-height:${compact ? 1.65 : 1.8};color:#d8e9ee;white-space:pre-wrap;word-break:break-all;font-family:monospace;`)}">${markdown.utils.escapeHtml(content)}</pre></div>`;
  markdown.renderer.rules.fence = (tokens, index) => codeBlock(tokens[index].content, tokens[index].info.trim().split(/\s+/)[0]);
  markdown.renderer.rules.code_block = (tokens, index) => codeBlock(tokens[index].content);
  markdown.renderer.rules.hr = () => `<div style="height:2px;background:#38546e;margin:${compact ? 8 : 28}px 0;"></div>`;
  markdown.renderer.rules.table_open = () => `<div style="overflow-x:auto;margin:${compact ? 6 : 22}px 0;"><table style="${textStyle('width:100%;border-collapse:collapse;font-size:14px;line-height:1.7;')}">`;
  markdown.renderer.rules.table_close = () => '</table></div>';
  const image = markdown.renderer.rules.image!;
  markdown.renderer.rules.image = (tokens, index, options, env, renderer) => {
    const source = tokens[index].attrGet('src')?.trim() ?? '';
    if (!/^(https?:\/\/|\/[^/])/i.test(source)) return '';
    const resolved = resolveImage(source);
    if (!resolved || !/^https?:\/\//i.test(resolved)) return '';
    tokens[index].attrSet('src', resolved);
    tokens[index].attrSet('style', `max-width:100%;height:auto;display:block;margin:${compact ? 6 : 18}px auto;`);
    return image(tokens, index, options, env, renderer);
  };
  return (content: string) => `<div style="${textStyle(`font-size:16px;line-height:${compact ? 1.65 : 1.95};color:#d2dce8;word-wrap:break-word;${compact ? 'white-space:normal;' : ''}`)}">${markdown.render(trimTextEnd(content))}</div>`;
}
