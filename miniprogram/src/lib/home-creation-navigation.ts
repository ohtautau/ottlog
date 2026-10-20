import Taro from '@tarojs/taro';

export type HomeCreationTarget = 'habit' | 'domain';
export type HomeCreationRequest = { target: HomeCreationTarget; owner: string };
let pending: HomeCreationRequest | null = null;

/** Tab navigation has no query; the existing editor consumes intent once on show. */
export function openHomeCreation(target: HomeCreationTarget, owner: string) {
  const request = { target, owner };
  pending = request;
  return Taro.switchTab({ url: target === 'habit' ? '/pages/daily/index' : '/pages/domains/index' }).catch(error => {
    if (pending === request) pending = null;
    throw error;
  });
}

export function takeHomeCreation(target: HomeCreationTarget): HomeCreationRequest | null {
  if (pending?.target !== target) return null;
  const request = pending;
  pending = null;
  return request;
}
