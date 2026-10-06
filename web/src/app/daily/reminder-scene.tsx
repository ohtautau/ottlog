import { memo, type CSSProperties, type ReactNode } from "react";
import styles from "./reminder-scene.module.css";

const ink = "#142635";
const cream = "#f2e4c5";
const blue = "#5a83ed";
const mint = "#9cd4be";
const clay = "#e6937f";
const pale = "#ccd9f0";

function Spark({ x, y, size = 12, delay = 0 }: { x: number; y: number; size?: number; delay?: number }) {
  return <g transform={`translate(${x} ${y})`}><path className={styles.spark} style={{ "--delay": `${delay}s` } as CSSProperties} d={`M0 ${-size} L${size * .25} ${-size * .25} L${size} 0 L${size * .25} ${size * .25} L0 ${size} L${-size * .25} ${size * .25} L${-size} 0 L${-size * .25} ${-size * .25}Z`} fill={cream} strokeWidth="2" /></g>;
}

function Pedestal() {
  return <g strokeWidth="2.5">
    <path d="M75 280 235 232 414 281 251 335Z" fill={ink} stroke="none" opacity=".5" />
    <path d="M62 267 225 219 401 266 238 315Z" fill="#263f54" />
    <path d="M62 267v13l176 49v-14ZM238 315l163-49v13l-163 50Z" fill="#203348" />
    <path d="m98 267 139 39m-102-50 139 39m-101-50 137 39m-100-50 138 39m-249 5 164-48m-131 58 164-48m-130 58 163-48m-130 58 163-48" fill="none" stroke="#486077" strokeWidth="1" opacity=".6" />
    <path d="m62 267 176 48 163-49" fill="none" stroke="#688199" strokeWidth="2" />
  </g>;
}

function Dumbbell({ x = 110, y = 135, small = false }: { x?: number; y?: number; small?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${small ? .55 : 1})`}>
    <path d="m14 90 215-52 23 12-218 56Z" fill={ink} opacity=".45" stroke="none" />
    <g className={styles.lift}>
      <g transform="rotate(-17 130 45)">
        <path d="M53 43h153v22H53Z" fill={pale} />
        <path d="M65 54h128" stroke={cream} strokeWidth="3" />
        <path d="m33 7 20-10 25 15v86L58 110 33 94Z" fill="#477469" />
        <path d="M20 17 47 5l25 14v78l-25 13-27-17Z" fill={mint} />
        <path d="m20 17 27 15 25-13M47 32v78" fill="none" />
        <path d="m191 7 21-10 26 15v86l-21 12-26-16Z" fill="#385595" />
        <path d="m179 17 27-12 26 14v78l-26 13-27-17Z" fill={blue} />
        <path d="m179 17 27 15 26-13M206 32v78" fill="none" />
        <path d="M21 40 9 46v25l13 7M232 39l13 7v24l-13 7" fill={cream} />
      </g>
    </g>
  </g>;
}

function Exercise() {
  return <><Dumbbell /><path className={styles.energy} d="m134 94 9-21m177 166 16 12m-174-13-14 17" fill="none" stroke={mint} strokeWidth="5" /><Spark x={335} y={108} size={15} /></>;
}

function Unplug() {
  return <>
    <g transform="rotate(-11 239 182)">
      <rect x="170" y="78" width="145" height="206" rx="16" fill="#304c75" />
      <rect x="155" y="68" width="145" height="206" rx="16" fill={pale} />
      <rect x="168" y="88" width="119" height="160" rx="4" fill={ink} />
      <path d="M210 77h38" strokeWidth="4" />
      <circle cx="228" cy="261" r="4" fill={ink} stroke="none" />
      <g className={styles.disconnect} fill="none" stroke={blue} strokeWidth="7" strokeLinecap="round">
        <path d="M187 140q41-40 82 0M204 158q24-23 48 0" />
        <circle cx="228" cy="179" r="5" fill={blue} stroke="none" />
      </g>
      <path className={styles.slash} d="m193 202 68-83" fill="none" stroke={clay} strokeWidth="8" />
    </g>
    <g className={styles.drift}><path d="m333 169 15-36 15 13-11 20 20 10-14 27-13-10 8-13Z" fill={mint} /><path d="m328 208-14 15m52-86 12-14" stroke={mint} /></g>
    <Spark x={116} y={122} size={10} />
  </>;
}

function Supplement() {
  return <>
    <g transform="translate(237 160) rotate(-37)">
      <g className={styles.capsuleLeft}><path d="M0-47h-54a47 47 0 0 0 0 94H0Z" fill="#7dac9f" /><path d="M-8-55h-54a47 47 0 0 0 0 94h54Z" fill={mint} /><path d="M-89-23q9-20 31-20" fill="none" stroke={cream} strokeWidth="6" /></g>
      <g className={styles.capsuleRight}><path d="M0-47h54a47 47 0 0 1 0 94H0Z" fill="#b06354" /><path d="M-8-55h54a47 47 0 0 1 0 94H-8Z" fill={clay} /><path d="M23-43h25" stroke={cream} strokeWidth="6" /></g>
      <circle className={styles.capsuleDot} cx="-8" cy="-7" r="8" fill={cream} strokeWidth="2" />
    </g>
    <path d="m114 253 35 11 38-11-35-10Z" fill={cream} /><path d="m322 227 31 9 27-8-30-9Z" fill={blue} />
    <Spark x={337} y={94} size={15} /><Spark x={125} y={182} size={8} delay={1} />
  </>;
}

function Music() {
  return <>
    <path d="m113 211 120-33 133 35v40l-121 37-132-38Z" fill="#344e80" />
    <path d="m105 193 125-35 130 37-122 36Z" fill={blue} />
    <path d="M105 193v39l133 39v-40m0 0 122-36v39l-122 37" fill="none" />
    <g transform="translate(228 173) scale(1 .64)"><g className={styles.record}>
      <circle r="90" fill={ink} /><circle r="73" fill="none" stroke="#3d5365" strokeWidth="3" /><circle r="58" fill="none" stroke="#3d5365" strokeWidth="3" /><circle r="43" fill="none" stroke="#3d5365" strokeWidth="3" /><circle r="27" fill={clay} /><path d="M0-27V0h27" fill={cream} /><circle r="5" fill={ink} />
    </g></g>
    <path d="m334 144-14 61-30-9" fill="none" stroke={cream} strokeWidth="8" /><circle cx="334" cy="144" r="9" fill={mint} /><path d="m285 187 16 4-4 11-16-4Z" fill={mint} />
    <g className={styles.noteFloat} fill={cream}><path d="M129 119V77l33-8v37" fill="none" stroke={cream} strokeWidth="5" /><ellipse cx="121" cy="121" rx="10" ry="7" /><ellipse cx="154" cy="108" rx="10" ry="7" /></g>
    <Spark x={346} y={88} size={11} />
  </>;
}

function Moon() {
  return <>
    <path d="m153 255 68-23 105 29-69 23Z" fill={blue} /><path d="m153 255v14l104 29v-14m0 0 69-23v14l-69 23" fill="#38538b" />
    <g className={styles.moonRock}><path d="M280 66a93 93 0 1 0 57 157 91 91 0 0 1-57-157Z" fill="#9a927a" /><path d="M269 56a93 93 0 1 0 57 157 91 91 0 0 1-57-157Z" fill={cream} /><path d="M183 145q-10 35 15 61" fill="none" stroke="#b8b093" strokeWidth="5" /></g>
    <Spark x={321} y={83} size={15} /><Spark x={352} y={151} size={9} delay={1.2} /><Spark x={137} y={95} size={8} delay={.6} />
    <path className={styles.sleep} d="M282 139h22l-22 25h22m13-56h17l-17 20h17" fill="none" stroke={mint} strokeWidth="5" />
  </>;
}

function Shower() {
  return <>
    <path d="m119 251 99-28 119 32-101 30Z" fill={pale} /><path d="M119 251v16l117 33v-15m0 0 101-30v16l-101 29" fill="#5c7696" />
    <path d="M141 244V101q0-29 30-29h87v38" fill="none" stroke={mint} strokeWidth="14" />
    <path d="m224 112 29-16 43 14 12 19-49 14-48-16Z" fill={blue} />
    <path d="m211 127 48 16 49-14" fill="none" stroke={cream} />
    <g className={styles.rain} fill="none" stroke={pale} strokeWidth="4" strokeDasharray="9 16"><path d="m228 146-17 83m38-77-7 87m28-88 4 87m16-94 17 84" /></g>
    <path d="m177 244 19 6m12 7 29 8m36-14 20-6" stroke={mint} strokeWidth="4" />
    <g className={styles.bubble} fill={cream}><circle cx="325" cy="195" r="10" /><circle cx="336" cy="171" r="5" /></g>
  </>;
}

function Brush() {
  return <>
    <path d="M160 110q20-45 72-18 48-30 77 10 24 31 4 87-8 79-37 74-17-3-22-45-5-32-15-32-10 1-17 35-8 42-25 39-33-7-34-75-18-45-3-75Z" fill="#6d8d9f" />
    <path d="M150 97q20-45 72-18 48-30 77 10 24 31 4 87-8 79-37 74-17-3-22-45-5-32-15-32-10 1-17 35-8 42-25 39-33-7-34-75-18-45-3-75Z" fill={cream} />
    <path d="M214 81q13 17 38 4" fill="none" stroke="#b6b49d" />
    <g className={styles.brush}><path d="m245 153 109 47-6 15-116-43Z" fill={mint} /><path d="m192 128 56 19-10 31-58-21Z" fill={blue} /><path d="m189 141 53 20m-44-31-6 14m17-10-6 14m17-10-6 14m17-10-6 14" stroke={cream} strokeWidth="4" /></g>
    <Spark x={152} y={94} size={17} /><Spark x={317} y={112} size={11} delay={1} />
  </>;
}

function Celebrate() {
  return <>
    <path d="m142 206 140-53-48 134Z" fill="#9f624f" />
    <path d="m130 195 141-54-49 134Z" fill={clay} />
    <path d="m153 188 18 31m14-44 16 37m13-48 20 37" stroke={cream} strokeWidth="10" />
    <g className={styles.confetti}><path d="m238 114 5-33 16 9-3 23m37 25 30-9 6 17-30 7m-61-38-14-21 12-9 15 22" fill={mint} /><path d="m304 204 25 8-6 15-28-10M171 105l9-28 15 6-10 28" fill={blue} /><path d="m274 75 20-7 7 17-22 6" fill={clay} /><circle cx="326" cy="102" r="7" fill={cream} /><circle cx="185" cy="141" r="5" fill={mint} /></g>
    <Spark x={285} y={117} size={16} /><Spark x={343} y={174} size={10} delay={.6} />
  </>;
}

function Breathe() {
  return <>
    <g className={styles.breatheRing} fill="none" stroke={mint} strokeWidth="2"><ellipse cx="239" cy="166" rx="139" ry="103" /><ellipse cx="239" cy="166" rx="113" ry="86" opacity=".45" /></g>
    <path d="M237 76v104m0-45-35 35m35-35 35 35" fill="none" stroke={cream} strokeWidth="10" strokeLinecap="round" />
    <g className={styles.lungs}>
      <path d="M215 107q-19-13-41 18-31 47-25 111 8 31 59 1 12-9 11-30Z" fill="#58897e" /><path d="M206 98q-19-13-41 18-31 47-25 111 8 31 59 1 12-9 11-30Z" fill={mint} />
      <path d="M262 107q19-13 41 18 31 47 25 111-8 31-59 1-12-9-11-30Z" fill="#3a5599" /><path d="M253 98q19-13 41 18 31 47 25 111-8 31-59 1-12-9-11-30Z" fill={blue} />
      <path d="m193 149-13 40m-1-2-13 8m108-46 13 40m-1-2 14 8" fill="none" stroke={cream} strokeWidth="3" />
    </g>
  </>;
}

function Pause() {
  return <>
    <g className={styles.hourglass}>
      <path d="M180 89h126v17l-51 65 49 83v17H179v-17l48-83-47-65Z" fill="#345371" />
      <path d="M167 77h126v17l-51 65 49 83v17H166v-17l48-83-47-65Z" fill={ink} />
      <path d="M181 95h98l-48 63Z" fill={pale} /><path d="m230 172-50 67h101Z" fill={pale} />
      <path d="m192 110 76 0-37 48Z" fill={cream} /><path d="m184 239 47-34 45 34Z" fill={clay} />
      <path className={styles.sand} d="M231 160v43" stroke={cream} strokeWidth="4" strokeDasharray="3 8" />
      <path d="M157 72h147v18H157Zm0 170h147v20H157Z" fill={mint} />
    </g>
    <path d="M339 120v47m17-47v47" stroke={cream} strokeWidth="8" /><Spark x={117} y={174} size={12} />
  </>;
}

function Focus() {
  return <>
    <path d="M250 107q72-18 92 52 26 92-80 118-113 9-123-73-8-64 45-89Z" fill="#a65e50" />
    <path d="M240 97q72-18 92 52 26 92-80 118-113 9-123-73-8-64 45-89Z" fill={clay} />
    <path d="m193 105-24-28 39 9 20-30 8 34 39-3-23 24" fill={mint} />
    <circle cx="234" cy="179" r="57" fill={cream} /><circle cx="234" cy="179" r="45" fill="none" stroke="#b8b3a0" strokeWidth="2" />
    <path d="M234 127v10m52 42h-10m-42 52v-10m-52-42h10" strokeWidth="4" />
    <g className={styles.clockHand}><path d="M234 179v-32m0 32 23 11" fill="none" strokeWidth="5" strokeLinecap="round" /></g><circle cx="234" cy="179" r="5" fill={blue} />
    <Spark x={344} y={111} size={13} />
  </>;
}

function Language() {
  return <>
    <g className={styles.wordOne}><path d="M111 109h150v100h-87l-30 25v-25h-33Z" fill="#547f73" /><path d="M100 98h150v100h-87l-30 25v-25h-33Z" fill={mint} /><text x="125" y="164" fill={ink} stroke="none" fontSize="56" fontWeight="800" fontFamily="Arial, sans-serif">Aa</text></g>
    <g className={styles.wordTwo}><path d="M223 162h139v100h-32v25l-31-25h-76Z" fill="#3b5590" /><path d="M212 151h139v100h-32v25l-31-25h-76Z" fill={blue} /><text x="238" y="219" fill={cream} stroke="none" fontSize="49" fontWeight="800" fontFamily="sans-serif">文</text></g>
    <path className={styles.exchange} d="M286 114h36l-10-10m10 10-10 10M177 263h-39l10-10m-10 10 10 10" fill="none" stroke={cream} strokeWidth="4" /><Spark x={335} y={85} size={9} />
  </>;
}

function Film() {
  return <>
    <path d="M123 131h239v140H123Z" fill="#344e80" /><path d="M111 119h239v140H111Z" fill={blue} />
    <g className={styles.clapper}><path d="m111 119-8-33 231-55 8 33Z" fill={cream} /><path d="m126 81 27-6-16 39-25 6m69-53 28-7-18 40-27 6m72-53 28-7-19 40-27 6m73-53 28-7-19 40-27 6" fill={ink} /></g>
    <path d="M111 137h239v15H111Z" fill={ink} />
    <g className={styles.filmFrames}><rect x="130" y="175" width="56" height="59" fill={cream} /><rect x="200" y="175" width="56" height="59" fill={mint} /><rect x="270" y="175" width="56" height="59" fill={clay} /><path d="m144 223 13-29 15 29m43-3 12-28 17 28m40 0 12-28 16 28" fill={blue} strokeWidth="2" /></g>
    <Spark x={371} y={110} size={11} />
  </>;
}

function Camera() {
  return <>
    <path d="M118 145h49l14-30h73l15 30h91v111H118Z" fill="#547568" /><path d="M107 134h49l14-30h73l15 30h91v111H107Z" fill={mint} />
    <path d="M107 165h242v56H107Z" fill="#538875" /><rect x="284" y="148" width="39" height="24" fill={cream} /><path d="M125 119h28v15h-28Z" fill={clay} />
    <circle cx="223" cy="188" r="63" fill={pale} /><circle cx="223" cy="188" r="51" fill={ink} />
    <g className={styles.aperture}><path d="m223 146 37 21-3 32-24 30-39-5-15-32 17-35Z" fill={blue} /><path d="m223 146 18 28-24 9m43-16-19 26-24-10m40 16-31-4-9-12m16 46-7-34-9-12m-23 41 15-27 8-14m-38 9 30 5 8-14m-21-26 20 26" fill="none" stroke={ink} strokeWidth="3" /></g>
    <Spark x={324} y={94} size={20} /><path className={styles.flash} d="m354 88 13-12m-36-13 3-18m23 61 20 2" stroke={cream} strokeWidth="4" />
  </>;
}

function Explore() {
  return <>
    <path d="m112 235 57-103 49 55 58-95 86 150-128 37Z" fill="#355346" /><path d="m102 224 57-103 49 55 58-95 86 150-128 37Z" fill={mint} /><path d="m159 121 19 71-44-26m132-85 12 164-70-69m32-51 28 17 16-26" fill={cream} />
    <circle cx="277" cy="207" r="60" fill="#a56552" /><circle cx="269" cy="197" r="60" fill={clay} /><circle cx="269" cy="197" r="47" fill={ink} />
    <g className={styles.compass}><path d="m269 159 16 38-16 38-16-38Z" fill={cream} /><path d="m269 159 16 38h-32Z" fill={blue} /></g>
    <circle cx="269" cy="197" r="5" fill={mint} /><path d="M269 142v10m55 45h-10m-45 55v-10m-55-45h10" strokeWidth="3" />
    <Spark x={122} y={99} size={13} />
  </>;
}

function Notes() {
  return <>
    <path d="m125 132 113-27 125 34v122l-125 29-113-35Z" fill="#577768" />
    <path d="m115 116 113-27 125 34v122l-125 29-113-35Z" fill={mint} /><path d="M228 89v185" fill="none" />
    <path d="m127 131 88-21v138l-88-24Zm114-21 97 25v97l-97 22Z" fill={cream} strokeWidth="2" />
    <g className={styles.pageLines} fill="none" stroke="#8d9b93" strokeWidth="4"><path d="m143 149 54-13m-54 33 54-13m-54 33 44-10m69-4 63 16m-63 6 48 12m-48-58 63 16" /></g>
    <g className={styles.bookmark}><path d="m279 118 21 6v78l-11-15-10 8Z" fill={blue} /></g>
    <Spark x={341} y={81} size={12} /><Spark x={113} y={95} size={7} delay={1} />
  </>;
}

function Pulse() {
  return <>
    <path d="m168 124 20-48h106l23 47-13 101-18 58H180l-17-58Z" fill="#3e6258" /><path d="m156 114 20-48h106l23 47-13 101-18 58H168l-17-58Z" fill={mint} />
    <path d="M172 82h104m-107 171h107" stroke="#557e6f" strokeWidth="5" />
    <rect x="151" y="108" width="151" height="120" rx="22" fill={pale} /><rect x="163" y="120" width="127" height="96" rx="12" fill={ink} /><path d="M301 151h10v25h-10" fill={clay} />
    <path className={styles.pulse} d="M174 170h22l10-17 11 41 13-57 12 33h34" fill="none" stroke={clay} strokeWidth="4" strokeLinejoin="round" />
    <circle className={styles.heartBeat} cx="226" cy="251" r="5" fill={clay} />
    <Spark x={331} y={108} size={11} />
  </>;
}

function Measure() {
  return <>
    <path d="m154 262 130-41 68 20-133 43Z" fill={ink} opacity=".5" stroke="none" />
    <g transform="rotate(16 199 171)"><path d="M156 63h77v214h-77Z" fill="#a98b64" /><path d="M146 54h77v214h-77Z" fill={cream} /><path d="M146 80h25m-25 17h15m-15 17h25m-25 17h15m-15 17h25m-25 17h15m-15 17h25m-25 17h15m-15 17h25m-25 17h15m-15 17h25" strokeWidth="3" /><circle cx="193" cy="73" r="5" fill={clay} /></g>
    <g className={styles.measureTape}><path d="M257 171q63-3 64 42v38h-43v-32q0-11-26-11h-29v-37Z" fill={blue} /><ellipse cx="251" cy="171" rx="48" ry="24" fill={mint} /><ellipse cx="251" cy="171" rx="23" ry="11" fill={ink} /><path d="M290 191v13m14-8v17m14-5v15m-38 9h39m-34 10h34" stroke={cream} strokeWidth="3" /></g>
    <Spark x={308} y={107} size={11} />
  </>;
}

function Bag() {
  return <>
    <g className={styles.pack}><path d="m142 98 14-17 49 8-5 45-58-8Z" fill={mint} /><path d="m219 99 19-41 36 13-6 48Z" fill={cream} /><path d="m285 109 12-35 27 9-2 37Z" fill={clay} /><path d="m303 75 4-12 15 4-1 14" fill={mint} /></g>
    <path d="M139 158q0-20 20-20h154q20 0 20 20v91q0 19-20 19H159q-20 0-20-19Z" fill="#385993" /><path d="M128 147q0-20 20-20h154q20 0 20 20v91q0 19-20 19H148q-20 0-20-19Z" fill={blue} />
    <path d="M185 139v-21q0-35 38-35t38 35v21" fill="none" stroke={cream} strokeWidth="10" />
    <rect x="143" y="181" width="55" height="49" rx="5" fill={mint} /><path d="M213 154v93m73-93v93m-72-87h74" fill="none" stroke="#375895" strokeWidth="5" /><path d="M135 166h180" stroke={cream} strokeWidth="3" /><path d="M304 166v13" stroke={clay} strokeWidth="7" />
    <Spark x={351} y={151} size={14} />
  </>;
}

function Stretch() {
  return <>
    <path d="m116 262 135-37 100 31-135 37Z" fill={blue} /><path d="m116 262 100 31v10l-100-31m100 21 135-37v10l-135 37" fill="#365795" />
    <g className={styles.stretch}><path d="M151 136q73-62 168 0v79q-73 61-168 0Z" fill="none" stroke="#53877b" strokeWidth="22" /><path d="M145 127q73-62 168 0v79q-73 61-168 0Z" fill="none" stroke={mint} strokeWidth="20" /><path d="M145 140v56m168-56v56" stroke={cream} strokeWidth="25" /><path d="M137 140h16m-16 13h16m-16 13h16m-16 13h16m-16 13h16m152-52h16m-16 13h16m-16 13h16m-16 13h16m-16 13h16" stroke={ink} strokeWidth="2" /></g>
    <path className={styles.stretchArrows} d="m104 161-20 14 20 14m248-28 20 14-20 14" fill="none" stroke={clay} strokeWidth="5" />
  </>;
}

function Plate({ slow = false }: { slow?: boolean }) {
  return <>
    <ellipse cx="238" cy="220" rx="113" ry="55" fill="#4c6c81" /><ellipse cx="229" cy="207" rx="113" ry="55" fill={pale} /><ellipse cx="229" cy="207" rx="88" ry="40" fill={cream} />
    <path d="M173 204q-3-47 38-48 47-4 53 44-25 35-91 4Z" fill={cream} /><path d="m183 180 5 5m16-14 4 5m17 1 4 6m-35 16 5 5m19-7 3 5m15-17 4 5" stroke="#ada88e" strokeWidth="3" />
    <path d="M260 212q-10-25 10-36 8-21 25-10 26-3 24 21 20 25-7 36-33 14-52-11Z" fill={mint} /><path d="m282 208 13-30m-13 26-10-12m16 0 12-3" fill="none" stroke="#548275" strokeWidth="3" /><path d="m159 219 24-10 19 9-19 17Zm12 20 25-10 18 10-19 13Z" fill={clay} />
    <g className={slow ? styles.slowFork : styles.fork}><path d="M343 115v129" stroke={cream} strokeWidth="7" /><path d="M332 110v31q0 17 11 17t11-17v-31" fill="none" stroke={cream} strokeWidth="5" /></g>
    {slow ? <><path className={styles.slowBreathe} d="M155 116q11-13 23 0t23 0m13 0q11-13 23 0t23 0" fill="none" stroke={mint} strokeWidth="4" /><path d="M112 151v45m-10-38v17q0 14 10 14" fill="none" stroke={cream} strokeWidth="5" /></> : <g className={styles.steam} fill="none" stroke={cream} strokeWidth="3"><path d="M190 137q-9-10 0-20t0-20m29 40q-9-10 0-20t0-20m29 40q-9-10 0-20t0-20" /></g>}
    <Spark x={319} y={90} size={10} />
  </>;
}

function Water() {
  return <><path d="m178 92 127 0-18 173h-91Z" fill="#527487" /><path d="m167 81 127 0-18 173h-91Z" fill={pale} /><path d="m181 139 99 0-11 101h-77Z" fill={blue} /><path className={styles.waterSurface} d="M185 151q22-15 45 0t46 0" fill="none" stroke={cream} strokeWidth="5" /><path d="m189 100 7 25m2 57 4 39" stroke={cream} strokeWidth="7" /><g className={styles.waterDrop}><path d="M334 102q-42 54 0 54t0-54Z" fill={mint} /></g><Spark x={120} y={168} size={12} /></>;
}

function Sun() {
  return <><path d="m119 252 112-24 125 30-117 33Z" fill={mint} /><g className={styles.sunRays} fill="none" stroke={cream} strokeWidth="9"><path d="M235 53v25m0 184v25M118 169h25m185 0h25M153 87l18 18m128 128 18 18M153 251l18-18M299 105l18-18" /></g><circle cx="244" cy="179" r="68" fill="#ac7350" /><circle cx="234" cy="169" r="68" fill={clay} /><path d="M204 177q30 31 60 0" fill="none" stroke={ink} strokeWidth="5" /><circle cx="211" cy="152" r="4" fill={ink}/><circle cx="257" cy="152" r="4" fill={ink}/><Spark x={365} y={112} size={10}/></>;
}

function Walk() {
  return <><path d="m105 263 76-25 154 28-80 26Z" fill={blue} /><g className={styles.walkBack}><path d="m179 151 52 3 17 62 53 20 0 27H159v-27Z" fill="#648b7b" /><path d="m170 142 52 3 17 62 53 20 0 27H150v-27Z" fill={mint} /><path d="M150 241h142m-80-57 23 1m-18 12 22 1" stroke={cream} strokeWidth="6" /></g><g className={styles.walkFront}><path d="m136 99 62-6 24 72 65 16 4 28-166 15-3-31Z" fill={pale} /><path d="m125 88 62-6 24 72 65 16 4 28-166 15-3-31Z" fill={cream} /><path d="m117 198 161-16m-101-60 25-3m-20 17 25-3m-20 17 25-3" fill="none" stroke={blue} strokeWidth="6" /></g><path className={styles.walkTrail} d="m315 220 18-5m-2-16 22-7m-9-13 18-5" stroke={mint} strokeWidth="5"/><Spark x={321} y={105}/></>;
}

function Plant() {
  return <><path d="m160 204 145 0-20 76h-105Z" fill="#9d6554" /><path d="m150 194 145 0-20 76H170Z" fill={clay} /><path d="M146 184h153v28H146Z" fill={cream}/><g className={styles.plantGrow}><path d="M224 185V101" fill="none" stroke={mint} strokeWidth="9" /><path d="M224 156q-77 0-67-68 68-5 67 68ZM224 135q-2-67 71-65 9 66-71 65Z" fill={mint}/><path d="m222 153-43-42m47 23 43-44" fill="none" stroke="#537e69" strokeWidth="4" /></g><path d="m185 222 8 30" stroke={cream} strokeWidth="6"/><g className={styles.waterDrop}><path d="M333 163q-25 33 0 33t0-33Z" fill={blue}/></g><Spark x={133} y={128}/></>;
}

function Coffee() {
  return <><ellipse cx="233" cy="258" rx="112" ry="30" fill="#51717c"/><ellipse cx="223" cy="248" rx="112" ry="30" fill={pale}/><path d="M282 144h30q45 0 36 42t-70 38" fill="none" stroke={mint} strokeWidth="19"/><path d="M149 136h142v74q0 49-70 49t-72-49Z" fill={mint}/><ellipse cx="220" cy="136" rx="71" ry="24" fill={cream}/><ellipse cx="220" cy="139" rx="58" ry="16" fill="#68513f"/><path d="M165 160v37q0 19 13 26" fill="none" stroke={cream} strokeWidth="7"/><g className={styles.coffeeSteam} fill="none" stroke={cream} strokeWidth="5"><path d="M187 103q-14-14 0-27t0-27m33 54q-14-14 0-27t0-27m33 54q-14-14 0-27t0-27"/></g><Spark x={351} y={101} size={11}/></>;
}

function Tidy() {
  return <><path d="m139 205 95-31 118 37-93 34Z" fill={cream}/><path d="M139 205v61l120 37v-58m0 0 93-34v62l-93 30" fill={blue}/><path d="m142 226 45 14 0 41-45-14Z" fill={mint}/><path d="m196 243 48 14v25l-48-14Z" fill={pale}/><g className={styles.tidyStack}><path d="m151 112 63-18 67 21-63 21Z" fill={cream}/><path d="M151 112v57l67 21v-54m0 0 63-21v54l-63 21" fill={clay}/><path d="m161 81 36-11 38 11-36 12Z" fill={mint}/><path d="M161 81v29l38 12V93m0 0 36-12v29l-36 12" fill={mint}/></g><g className={styles.tidySweep}><path d="m309 99-41 99 33 14 41-99Z" fill={cream}/><path d="m268 189 39 15-9 41-55-21Z" fill={mint}/><path d="m259 214 9-22m3 29 9-22m3 26 9-22" strokeWidth="3"/></g><Spark x={117} y={151}/></>;
}

function Write() {
  return <><path d="m139 100 153 0 37 173H161Z" fill="#486381"/><path d="m128 90 153 0 37 173H150Z" fill={cream}/><path d="m150 119 100 0m-96 20h78m-73 20h64m-59 20h69" fill="none" stroke="#94a195" strokeWidth="5"/><path className={styles.inkLine} d="M168 221q11-30 19 0t18-8 20-3 23 2 31-7" fill="none" stroke={blue} strokeWidth="5"/><g className={styles.penWrite}><path d="m250 177 58-112 22 11-58 112-23 17Z" fill={blue}/><path d="m308 65 7-15q6-10 16-5t6 17l-7 14Z" fill={clay}/><path d="m249 205 1-28 22 11Z" fill={mint}/></g><Spark x={340} y={211} size={11}/></>;
}

function Connect() {
  return <><path d="m126 250 120-36 116 41-121 33Z" fill={blue}/><g className={styles.friendLeft}><path d="M104 210q0-50 55-50t55 50v28H104Z" fill={mint}/><circle cx="159" cy="131" r="37" fill={cream}/><path d="m133 100 18-19 31 13 14 26-39-10-32 18Z" fill={ink}/></g><g className={styles.friendRight}><path d="M263 239v-28q0-50 54-50t54 50v28Z" fill={clay}/><circle cx="316" cy="132" r="36" fill={pale}/><path d="M283 121q-7-50 46-38 34 6 27 54l-24-35-49 19Z" fill={ink}/></g><g className={styles.friendMessage}><path d="M194 68h83v58h-28l-22 19v-19h-33Z" fill={mint}/><path d="M215 91q10-13 20 1 10-14 20-1 9 12-20 27-29-15-20-27Z" fill={clay}/></g><Spark x={230} y={204} size={11}/></>;
}

function SceneContent({ kind }: { kind: string }): ReactNode {
  switch (kind) {
    case "exercise": return <Exercise />;
    case "unplug": return <Unplug />;
    case "supplement": return <Supplement />;
    case "music": return <Music />;
    case "moon": return <Moon />;
    case "shower": return <Shower />;
    case "brush": return <Brush />;
    case "celebrate": return <Celebrate />;
    case "breathe": return <Breathe />;
    case "pause": return <Pause />;
    case "focus": return <Focus />;
    case "language": return <Language />;
    case "film": return <Film />;
    case "camera": return <Camera />;
    case "explore": return <Explore />;
    case "notes": return <Notes />;
    case "pulse": return <Pulse />;
    case "measure": return <Measure />;
    case "bag": return <Bag />;
    case "stretch": return <Stretch />;
    case "food": return <Plate />;
    case "slow": return <Plate slow />;
    case "water": return <Water />;
    case "sun": return <Sun />;
    case "walk": return <Walk />;
    case "plant": return <Plant />;
    case "coffee": return <Coffee />;
    case "tidy": return <Tidy />;
    case "write": return <Write />;
    case "connect": return <Connect />;
    default: return <Explore />;
  }
}

/** A decorative scene; its corresponding reminder provides the accessible name. */
function ReminderScene({ kind, active = true, staticImage = false }: { kind: string; active?: boolean; staticImage?: boolean }) {
  return <svg className={styles.scene} data-active={active} data-static={staticImage} data-scene={kind} viewBox="0 0 480 360" fill="none" stroke={ink} strokeWidth="4" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M74 82V65h18m296 0h18v17M74 290v17h18m296 0h18v-17" stroke="#60839f" strokeWidth="2" opacity=".55" />
    <circle cx="105" cy="65" r="2" fill={mint} stroke="none" />
    <path d="M362 306h12m7 0h6" stroke={mint} strokeWidth="2" />
    <Pedestal />
    <SceneContent kind={kind} />
  </svg>;
}

export default memo(ReminderScene);
