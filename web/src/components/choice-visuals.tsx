import styles from '@/app/choose/choice.module.css';

export const surfaces = ['#254d62', '#79503e', '#435741', '#454466', '#235c5b', '#713b4b', '#354e6b', '#6a5831', '#554c44'];

export function ChoiceMark({ variant }: { variant: number }) {
  const mark = variant % 8;
  return <svg viewBox='0 0 160 160' fill='none' className={styles.mark} aria-hidden='true'>
    <g stroke='currentColor' strokeWidth='5' strokeLinejoin='round'>
      {mark === 0 && <><circle cx='80' cy='80' r='39'/><path d='M80 12v18m0 100v18M12 80h18m100 0h18M32 32l13 13m70 70 13 13M32 128l13-13m70-70 13-13'/><circle cx='80' cy='80' r='15' fill='currentColor'/></>}
      {mark === 1 && <><path d='M30 135V67a50 50 0 0 1 100 0v68M52 135V68a28 28 0 0 1 56 0v67M18 135h124'/><path d='M80 72v63' strokeDasharray='5 10'/></>}
      {mark === 2 && <><path d='m15 120 40-78 29 49 23-38 38 67Z'/><path d='m43 66 12 10 11-9M91 80l16 9 11-15'/><circle cx='113' cy='23' r='10' fill='currentColor'/></>}
      {mark === 3 && <><path d='M20 128V98h30V68h30V38h30V8M20 145h110V38h-20M50 128V98h30V68h30'/><path d='m131 14 16 16-16 16'/></>}
      {mark === 4 && <><ellipse cx='80' cy='80' rx='64' ry='26' transform='rotate(-35 80 80)'/><circle cx='80' cy='80' r='36'/><circle cx='132' cy='45' r='9' fill='currentColor'/><path d='m32 21 8 8m-8 0 8-8'/></>}
      {mark === 5 && <><path d='M18 55q20-32 41 0t42 0 41 0M18 85q20-32 41 0t42 0 41 0M18 115q20-32 41 0t42 0 41 0'/></>}
      {mark === 6 && <><path d='m80 14 56 32v66l-56 33-56-33V46Zm-56 32 56 33 56-33M80 79v66M51 30l57 33v64'/></>}
      {mark === 7 && <><path d='M23 116 61 74l28 23 46-62'/><circle cx='23' cy='116' r='10' fill='currentColor'/><circle cx='61' cy='74' r='9' fill='currentColor'/><circle cx='89' cy='97' r='9' fill='currentColor'/><path d='m108 37 28-4-2 29'/></>}
    </g>
  </svg>;
}

