import Taro from '@tarojs/taro';

let pending = false;
export function openAccount() {
  pending = true;
  return Taro.switchTab({ url: '/pages/index/index' }).then(() => {
    Taro.eventCenter.trigger('ottlog-open-account');
  }).catch(error => { pending = false; throw error; });
}
export function takeAccountRequest() {
  const requested = pending; pending = false; return requested;
}
