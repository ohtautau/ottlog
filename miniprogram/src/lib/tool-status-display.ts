/** Hide routine storage notices on tool pages without changing store state. */
export function toolPageStatus(status: string): string {
  return status === '保存在本机 · 登录后可使用账号同步' ? '' : status;
}

export function personalDataNotice(authenticated: boolean): string {
  return authenticated ? '日常工具按当前账号保存与同步，游客记录不会自动合并。' : '日常工具数据保存在本机，登录后可使用账号同步；游客记录不会自动合并。';
}
