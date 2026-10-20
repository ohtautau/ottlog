import { isMottoRotationSeconds, isPersonalMottos, type PersonalMottos } from './motto-data';

export function writeMottoRotation(value: PersonalMottos, seconds: number): PersonalMottos {
  if (!isPersonalMottos(value)) throw new Error('数据格式暂不兼容，请重新读取');
  if (!isMottoRotationSeconds(seconds)) throw new Error('请输入 1–2147483 之间的整数秒数');
  return { ...value, rotationSeconds: seconds };
}
