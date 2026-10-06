import type { CSSProperties } from "react";
import styles from "./pomodoro.module.css";

export default function TomatoScene({ progress, running, resting }: { progress: number; running: boolean; resting: boolean }) {
  return <svg className={styles.tomato} viewBox="0 0 480 430" aria-hidden="true" data-running={running} data-resting={resting}>
    <ellipse cx="248" cy="365" rx="170" ry="29" fill="#0a1623" />
    <g className={styles.dial}>
      {Array.from({ length: 36 }, (_, i) => <path key={i} d="M240 39V49" stroke={i / 36 <= progress ? "#ebac98" : "#465d71"} strokeWidth={i % 3 === 0 ? 4 : 2} transform={`rotate(${i * 10} 240 217)`} />)}
    </g>
    <g className={styles.fruit}>
      <path d="M233 97C166 62 80 99 68 201C55 303 121 356 235 363C352 374 414 302 410 215C408 112 335 71 266 97Z" fill="#923f3c" />
      <path d="M233 86C167 51 83 85 71 185C58 285 121 339 232 346C346 357 407 286 404 201C401 102 331 62 266 86Z" fill={resting ? "#83ada0" : "#dd8a77"} />
      <path d="M233 86C178 101 159 217 186 297C197 331 214 344 232 346C173 333 140 297 142 209C141 145 173 84 233 86Z" fill={resting ? "#5b8b7e" : "#bd6a5a"} />
      <path d="M266 86C322 97 350 162 341 228C337 287 304 329 268 341C303 318 313 257 307 203C302 139 289 108 266 86Z" fill={resting ? "#a8ceae" : "#eda48b"} />
      <path d="M211 93L185 67L224 76L230 45L250 69L281 47L270 78L307 73L280 101L270 123L248 108L221 122Z" fill="#628375" />
      <path d="M246 84Q237 45 266 25" fill="none" stroke="#a8ceae" strokeWidth="12" strokeLinecap="square" />
      <path d="M112 153Q123 119 147 115" fill="none" stroke={resting ? "#c4ded0" : "#f5c7ab"} strokeWidth="8" strokeLinecap="square" />
    </g>
    <g className={styles.floatingSeeds}>{[0, 1, 2].map(i => <path key={i} d="M0 0L7 -10L14 0L7 10Z" fill={resting ? "#a8ceae" : "#dfd4b4"} transform={`translate(${82 + i * 153} ${95 + (i % 2) * 197})`} style={{ "--seed": i } as CSSProperties} />)}</g>
    <path className={styles.sweep} d="M67 356H405" stroke={resting ? "#a8ceae" : "#ebac98"} strokeWidth="4" pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: 1 - progress }} />
    <g fill="#98afc4" fontSize="9" letterSpacing="2" fontFamily="Arial,sans-serif"><text x="73" y="402">ONE THING</text><text x="308" y="402">AT A TIME</text></g>
  </svg>;
}
