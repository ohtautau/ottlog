import type { MealKind } from "./meal-data";

/** Small, code-native illustrations keep the two choices readable without remote images. */
export default function MealCardArt({ kind }: { kind: MealKind }) {
  return <svg viewBox="0 0 220 180" aria-hidden="true" focusable="false">
    <ellipse cx="112" cy="151" rx="78" ry="13" fill="#081727" opacity=".4" />
    {kind === "bread" ? <g stroke="#293b48" strokeWidth="4" strokeLinejoin="round">
      <path d="m43 97 59-58 78 47-63 54z" fill="#bc7d4f" /><path d="m43 86 59-58 78 47-63 54z" fill="#edd1a1" />
      <path d="m48 100 21-4 12 17 20-3 18 20 55-43" fill="none" stroke="#a6c884" strokeWidth="10" />
      <path d="m45 107 71 41 60-47" fill="none" stroke="#db8b6b" strokeWidth="9" />
      <path d="m43 117 74 43 63-48v-13l-63 45-74-43z" fill="#d7a168" />
      <path d="m80 75 13-12m12 23 14-13m10 23 13-13" stroke="#bf8e5d" />
    </g> : <>
      <path d="M29 93Q33 155 110 157Q187 155 191 93Z" fill={kind === "hotpot" ? "#d3846b" : "#c4d4e0"} stroke="#293b48" strokeWidth="4" />
      <path d="M120 105v45q53-2 66-45" fill="#294157" opacity=".23" />
      <ellipse cx="110" cy="93" rx="81" ry="36" fill="#ecdec8" stroke="#293b48" strokeWidth="4" />
      <ellipse cx="110" cy="94" rx="69" ry="26" fill={kind === "hotpot" ? "#b85843" : kind === "light" ? "#84a584" : "#c39765"} />
      {kind === "noodles" || kind === "hotpot" ? <g fill="none" stroke="#f6d6a0" strokeWidth="5" strokeLinecap="round">
        <path d="M57 90q11-15 22 0t22 0t22 0t22 0t17 0M59 105q11-15 22 0t22 0t22 0t22 0" />
        <path d="m153 70 35-44m-26 51 34-41" stroke="#b98561" strokeWidth="6" />
      </g> : kind === "rice" ? <g fill="#f7e9c8">{Array.from({ length: 15 }, (_, i) => <ellipse key={i} cx={64 + (i % 5) * 23} cy={81 + Math.floor(i / 5) * 12} rx="8" ry="3" transform={`rotate(-20 ${64 + (i % 5) * 23} ${81 + Math.floor(i / 5) * 12})`} />)}</g> : <g fill="#c5d995" stroke="#47735e" strokeWidth="3"><path d="M61 99q-17-34 19-30q19 22-19 30M119 101q-9-44 28-31q14 27-28 31M95 114q-29-26 6-34q25 8-6 34" /></g>}
      <ellipse cx="143" cy="88" rx="19" ry="13" fill="#f7e7c8" /><ellipse cx="144" cy="87" rx="10" ry="8" fill="#e7ac59" />
      <path d="m66 86 11-6m30 27 13-4" stroke="#82b898" strokeWidth="6" />
    </>}
  </svg>;
}
