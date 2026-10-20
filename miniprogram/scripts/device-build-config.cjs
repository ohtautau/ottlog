function deviceBuildEnvironment(environment, args = []) {
  const apiBase = environment.TARO_APP_API_BASE_URL?.trim();
  if (apiBase) {
    let url;
    try { url = new URL(apiBase); } catch { throw new Error('TARO_APP_API_BASE_URL must be a valid HTTP(S) URL.'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('TARO_APP_API_BASE_URL must use HTTP(S).');
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (host === 'localhost' || host.endsWith('.localhost') || host === '[::1]' || host.startsWith('127.')) {
      throw new Error('Device builds cannot use a loopback API address. Set TARO_APP_API_BASE_URL to a phone-reachable HTTPS endpoint or the computer LAN address, then rebuild.');
    }
  }
  return {
    ...environment,
    NODE_ENV: 'production', TARO_DEVICE_DEBUG: '1',
    ...(apiBase ? { TARO_APP_API_BASE_URL: apiBase } : {}),
    OTTLOG_MINIPROGRAM_PREVIEW: args.includes('--preview-records') ? '1' : environment.OTTLOG_MINIPROGRAM_PREVIEW === '1' ? '1' : '0',
  };
}
module.exports = { deviceBuildEnvironment };
