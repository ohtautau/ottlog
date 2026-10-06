"use client";

import ToolNavigation from "@/components/tool-navigation";
import ToolDataTransfer from "@/components/tool-data-transfer";

import { useRef, useState, type CSSProperties, type FormEvent } from "react";
import { usePersonalToolState } from "@/lib/use-personal-tool-state";
import { initialMealLibrary, isMealLibrary, kindLabels, occasionLabels, type Meal, type MealKind, type MealLibrary, type Occasion } from "./meal-data";
import styles from "./meal.module.css";
import MealGames from "./meal-games";
import NutritionDiary from "./nutrition-diary";

const blankMeal: Meal = { id: "", name: "", place: "", note: "", price: 20, minutes: 15, spicy: false, vegetarian: false, occasions: ["lunch", "dinner"], kind: "rice" };

function FoodArt({ kind = "noodles", compact = false }: { kind?: MealKind; compact?: boolean }) {
  return <svg viewBox="0 0 440 370" className={`${styles.foodArt} ${compact ? styles.compactArt : ""}`} aria-hidden="true">
    <ellipse cx="225" cy="316" rx="153" ry="20" fill="#080f1d" opacity=".5" />
    <g className={styles.steam} fill="none" stroke="#eedbc1" strokeWidth="7" strokeLinecap="round">
      <path d="M167 122 C142 101 185 91 165 67" />
      <path d="M218 109 C193 89 239 78 218 48" />
      <path d="M269 123 C246 101 284 86 269 66" />
    </g>
    <ellipse cx="220" cy="289" rx="123" ry="24" fill="#58799a" />
    <path d="M72 180 C80 277 136 311 220 311 C304 311 360 277 368 180 Z" fill="#e2cbb0" stroke="#172638" strokeWidth="6" />
    <path d="M250 193 L351 187 C340 256 305 284 250 295 Z" fill="#c59375" />
    <path d="M105 224 L148 274 M134 230 L170 280 M164 236 L191 284" stroke="#b27258" strokeWidth="8" />
    <ellipse cx="220" cy="179" rx="148" ry="62" fill="#f3e0c5" stroke="#172638" strokeWidth="6" />
    <ellipse cx="220" cy="181" rx="129" ry="47" fill={kind === "hotpot" ? "#b15743" : kind === "light" ? "#8aa482" : "#ad805d"} />
    {kind === "noodles" || kind === "hotpot" ? <g fill="none" stroke="#f4d997" strokeWidth="7" strokeLinecap="round">
      <path d="M119 177 C142 144 161 206 188 172 S228 202 249 170 S286 196 314 170" />
      <path d="M123 193 C145 164 166 220 194 187 S232 217 258 183 S286 210 318 185" />
      <path d="M155 156 C170 138 185 175 205 156 S240 169 262 153" />
    </g> : kind === "bread" ? <g stroke="#172638" strokeWidth="5" strokeLinejoin="round">
      <path d="M137 187 L185 140 L272 157 L244 208 Z" fill="#d99354" /><path d="M147 190 L192 156 L264 171 L242 197 Z" fill="#84a37c" /><path d="M147 178 L192 142 L263 158 L238 185 Z" fill="#f1d99d" />
    </g> : kind === "rice" ? <g fill="#eddfbd">
      {Array.from({ length: 18 }, (_, i) => <ellipse key={i} cx={130 + (i % 6) * 30} cy={162 + Math.floor(i / 6) * 18} rx="10" ry="4" transform={`rotate(-25 ${130 + (i % 6) * 30} ${162 + Math.floor(i / 6) * 18})`} />)}
    </g> : <g fill="#cfde99" stroke="#658461" strokeWidth="4"><path d="M142 186 Q123 144 176 149 Q194 184 142 186" /><path d="M229 183 Q209 135 264 157 Q274 187 229 183" /><path d="M193 209 Q163 168 218 173 Q238 204 193 209" /></g>}
    <g className={styles.garnish}>
      <ellipse cx="275" cy="161" rx="33" ry="22" fill="#f7edd1" transform="rotate(12 275 161)" /><ellipse cx="275" cy="161" rx="17" ry="13" fill="#eeb451" />
      <path d="M126 164 L145 151 L156 165 L138 176 Z" fill="#77a88c" /><path d="M219 198 L243 194 L246 207 L223 211 Z" fill="#7baa86" />
      <path d="M302 187 Q333 161 329 191 Q315 211 302 187" fill="#d46e52" />
    </g>
    <g className={styles.chopsticks} strokeLinecap="square"><path d="M298 147 L369 52" stroke="#233849" strokeWidth="12" /><path d="M310 153 L389 68" stroke="#233849" strokeWidth="12" /><path d="M294 143 L365 48 M306 149 L385 64" stroke="#dba882" strokeWidth="7" /></g>
  </svg>;
}

export default function MealExperience() {
  const { value, setValue, ready, status, retry, owner } = usePersonalToolState<MealLibrary>("meals", initialMealLibrary);
  const valid = isMealLibrary(value);
  const meals = valid ? value.meals : [];
  const [panel, setPanel] = useState("games");
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Meal>(blankMeal);
  const [notice, setNotice] = useState("");
  const [deleted, setDeleted] = useState<Meal | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLFormElement>(null);
  const libraryRef = useRef<HTMLDetailsElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const filtered = meals.filter((m) => `${m.name} ${m.place} ${m.note}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const canRetry = /重试|暂存|不可用|未成功/.test(status);

  function bringPanelIntoView() {
    requestAnimationFrame(() => { panelRef.current?.scrollTo({ top: 0 }); panelRef.current?.focus({ preventScroll: true }); });
  }

  function begin() {
    setPanel("games"); bringPanelIntoView(); }

  function openEditor(meal?: Meal) {
    setPanel("library");
    setDraft(meal ? { ...meal, occasions: [...meal.occasions] } : { ...blankMeal, occasions: [...blankMeal.occasions] });
    setEditorOpen(true); setNotice("");
    if (libraryRef.current) libraryRef.current.open = true;
    requestAnimationFrame(() => { editorRef.current?.scrollIntoView({ block: "center" }); nameRef.current?.focus({ preventScroll: true }); });
  }

  function saveMeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    const next = { ...draft, id: draft.id || crypto.randomUUID(), name: draft.name.trim(), place: draft.place.trim(), note: draft.note.trim() };
    if (!isMealLibrary({ version: 1, meals: [next] })) { setNotice("请填写名称、有效的价格和时间，并至少选择一个用餐时段。"); return; }
    if (meals.some((m) => m.id !== next.id && m.name === next.name && m.place === next.place)) { setNotice("餐单里已经有这家店的这道菜了，可以直接编辑它。"); return; }
    if (!draft.id && meals.length >= 150) { setNotice("餐单最多保存 150 道菜，请先移除暂时不吃的餐食。"); return; }
    setValue((previous) => {
      const existing = isMealLibrary(previous) ? previous.meals : [];
      return { ...previous, version: 1, meals: existing.some((m) => m.id === next.id) ? existing.map((m) => m.id === next.id ? next : m) : [...existing, next] };
    });
    setEditorOpen(false); setNotice(`已${draft.id ? "更新" : "加入"}「${next.name}」。`);
  }

  function removeMeal(meal: Meal) {
    setValue((previous) => ({ ...previous, version: 1, meals: isMealLibrary(previous) ? previous.meals.filter((m) => m.id !== meal.id) : [] }));
    if (draft.id === meal.id) setEditorOpen(false);
    setDeleted(meal); setNotice(`已移除「${meal.name}」。`);
  }

  function undoRemove() {
    if (!deleted || meals.length >= 150) return;
    setValue((previous) => ({ ...previous, version: 1, meals: isMealLibrary(previous) ? previous.meals.some((m) => m.id === deleted.id) ? previous.meals : [...previous.meals, deleted] : [deleted] }));
    setNotice(`已恢复「${deleted.name}」。`); setDeleted(null);
  }

  return <div className={styles.page} data-tool-page data-tool-workspace="eat">
    <ToolNavigation />
    <div className={styles.dataBar} aria-label="开饭指南数据管理"><p><strong>餐单与饮食记录</strong><span>一份备份，包含菜品与每天的碳水、蛋白质、脂肪记录。</span></p><ToolDataTransfer key={owner} tool="meals" value={value} setValue={setValue} ready={ready} status={status} owner={owner} onImported={() => { setEditorOpen(false); setDeleted(null); setNotice(""); }} /></div>
    <section data-tool-header className={styles.hero} aria-labelledby="eat-heading">
      <div className={styles.heroCopy}>
        <p data-tool-kicker className={styles.kicker}><span /> 把选择困难，留在开饭之前。</p>
        <h1 id="eat-heading">开饭<span>指南。</span></h1>
        <p data-tool-description className={styles.description}>胃已经准备好了，脑袋还没有。<br />滑一张卡，或回答几个小问题，给这一餐一个答案。</p>
        <button type="button" className={styles.primary} onClick={begin} disabled={!ready || !valid}>帮我想一想 </button>
        <button type="button" className={styles.secondary} style={{ marginTop: 16 }} onClick={() => openEditor()} disabled={!ready || !valid || meals.length >= 150}>＋ 新增菜品</button>
        <p className={styles.heroNote}>两种小游戏 <span>·</span> 从你的餐单里选</p>
        {(!ready || canRetry) && <p className={styles.connectionStatus} role="status">{status}{canRetry && <button type="button" onClick={retry}>重试连接 ↻</button>}</p>}
      </div>
      <div data-tool-art="meal" className={styles.poster}>
        <div className={styles.posterHead}><span>GOOD FOOD.<br />GOOD MOOD.</span><span className={styles.posterNumber}>01</span></div>
        <FoodArt />
        <div className={styles.posterFoot}><span>好好吃饭。<br /><small>先照顾好今天的自己。</small></span><span className={styles.rotatingMark} aria-hidden="true">✳</span></div>
        <span className={styles.posterSide}>A LITTLE LESS THINKING, A LITTLE MORE EATING.</span>
      </div>
    </section>

    <div className="tool-panel-tabs" role="group" aria-label="开饭指南视图">{[["games", "选这一餐"], ["nutrition", "饮食记录"], ["library", "我的餐单"]].map(([key, label]) => <button type="button" key={key} aria-pressed={panel === key} onClick={() => setPanel(key)}>{label}</button>)}</div>
    <div className="tool-workspace-panel" hidden={panel !== "nutrition"}>
    <NutritionDiary key={owner} value={value} setValue={setValue} ready={ready && valid} status={status} />

    </div>
    <div className="tool-workspace-panel" hidden={panel !== "games"} ref={panelRef} tabIndex={-1}><MealGames key={owner + JSON.stringify(meals)} meals={meals} ready={ready && valid} /></div>

    <details className={`${styles.library} tool-workspace-panel`} hidden={panel !== "library"} open ref={libraryRef}>
      <summary><span><small>MY LITTLE MENU</small><strong>我的餐单<span>{meals.length}</span></strong></span><span className={styles.libraryToggle} aria-hidden="true">+</span></summary>
      <div className={styles.libraryBody}>
        <div className={styles.libraryIntro}><p>先放进了 26 道示例餐食。<br />把它们换成你常去的店、常吃的菜，答案会越来越像你。示例价格和时间仅用于体验，可以自行修改。</p><button type="button" className={styles.secondary} disabled={!ready || meals.length >= 150} onClick={() => openEditor()}>加一道常吃的 +</button></div>
        <p className={styles.saveStatus} role="status">{status}{canRetry && <button type="button" className={styles.textButton} onClick={retry}>重试同步 ↻</button>}</p>
        {(notice || deleted) && <div className={styles.notice} role="status">{notice}{deleted && <button type="button" onClick={undoRemove} disabled={meals.length >= 150}>撤销移除</button>}</div>}
        {editorOpen && <form className={styles.editor} ref={editorRef} onSubmit={saveMeal}>
          <div className={styles.editorHeading}><h3>{draft.id ? "编辑这一餐" : "记一道常吃的"}</h3><button type="button" className={styles.textButton} onClick={() => setEditorOpen(false)}>取消 ×</button></div>
          <div className={styles.formGrid}><label>餐食名称<input ref={nameRef} required maxLength={60} value={draft.name} placeholder="例如：楼下的牛肉面" onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label>店名 / 地点<input maxLength={100} value={draft.place} placeholder="例如：公司旁边的小面馆" onChange={(event) => setDraft({ ...draft, place: event.target.value })} /></label><label>预计每人花费（元）<input type="number" required min="0" max="10000" step="0.01" value={Number.isNaN(draft.price) ? "" : draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value === "" ? NaN : Number(event.target.value) })} /></label><label>预计准备时间（分钟）<input type="number" required min="1" max="1440" step="1" value={Number.isNaN(draft.minutes) ? "" : draft.minutes} onChange={(event) => setDraft({ ...draft, minutes: event.target.value === "" ? NaN : Number(event.target.value) })} /></label><label>餐食类型<select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as MealKind })}>{Object.entries(kindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>给这道菜留句话<input maxLength={200} value={draft.note} placeholder="口味、招牌，或者想去的理由" onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label></div>
          <fieldset className={styles.mealTimes}><legend>什么时候会吃？<small>至少选择一项</small></legend>{Object.entries(occasionLabels).map(([key, label]) => <label className={styles.checkbox} key={key}><input type="checkbox" checked={draft.occasions.includes(key as Occasion)} onChange={(event) => setDraft({ ...draft, occasions: event.target.checked ? [...draft.occasions, key as Occasion] : draft.occasions.filter((o) => o !== key) })} />{label}</label>)}</fieldset>
          <div className={styles.formChecks}><label className={styles.checkbox}><input type="checkbox" checked={draft.spicy} onChange={(event) => setDraft({ ...draft, spicy: event.target.checked })} />这道菜是辣的</label><label className={styles.checkbox}><input type="checkbox" checked={draft.vegetarian} onChange={(event) => setDraft({ ...draft, vegetarian: event.target.checked })} />无肉餐食（可含蛋奶）</label></div>
          <button className={styles.primary} type="submit" disabled={!ready}>保存到餐单 </button>
        </form>}
        <label className={styles.librarySearch}><span>找一道菜</span><input type="search" placeholder="搜索菜名、店名或备注…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <div className={styles.mealList}>{filtered.map((meal, index) => <article className={styles.mealRow} key={meal.id} style={{ "--row-index": index % 6 } as CSSProperties}><span className={styles.mealIndex}>{String(meals.indexOf(meal) + 1).padStart(2, "0")}</span><div className={styles.mealInfo}><h3>{meal.name}</h3><p>{meal.place || kindLabels[meal.kind]}</p><div className={styles.rowTags}><span>{meal.spicy ? "辣" : "不辣"}</span>{meal.vegetarian && <span>无肉</span>}<span>{meal.occasions.map((o) => occasionLabels[o]).join(" / ")}</span></div></div><div className={styles.rowNumbers}><strong>¥{meal.price}</strong><span>{meal.minutes} 分钟</span></div><div className={styles.rowActions}><button type="button" disabled={!ready} onClick={() => openEditor(meal)} aria-label={`编辑${meal.name}`}>编辑</button><button type="button" disabled={!ready} onClick={() => removeMeal(meal)} aria-label={`移除${meal.name}`}>移除</button></div></article>)}</div>
        {!filtered.length && <p className={styles.noSearchResults}>{meals.length ? "还没有找到这道菜，换个词试试？" : "还没有餐食。点「加一道常吃的」，从你最喜欢的那道开始。"}</p>}
      </div>
    </details>
    <div className={styles.bottomNote}><span>好好吃饭，是今天可以先完成的小事。</span></div>
  </div>;
}
