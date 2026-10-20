/** Clean only the end of displayed/submitted text; keep indentation and internal blank lines. */
export function trimTextEnd(text: string): string {
  return text.trimEnd();
}
