"use client";

import { useRef, useState, type ChangeEvent } from "react";
import ReminderScene from "./reminder-scene";
import HabitIcon from "./habit-icon";
import { isBackgroundImage, scenes, type Reminder, type Scene } from "./reminders";
import styles from "./daily.module.css";

async function compressImage(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("请选择 JPG、PNG 或 WebP 图片。");
  if (file.size > 10 * 1024 * 1024) throw new Error("请选择小于 10 MB 的图片。");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法读取图片，请改用图片网址。");
    for (const size of [420, 320, 240, 180, 128]) {
      const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.fillStyle = "#1a2a3a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [.82, .64, .46]) {
        const data = canvas.toDataURL("image/webp", quality);
        if (isBackgroundImage(data)) return data;
      }
    }
    throw new Error("图片细节过多，请裁剪后再选择，或使用图片网址。");
  } finally { bitmap.close(); }
}

export default function ReminderAppearance({ reminder, onBusy }: { reminder: Reminder | null; onBusy: (busy: boolean) => void }) {
  const [kind, setKind] = useState<Scene>(reminder?.kind ?? "celebrate");
  const [backgroundKind, setBackgroundKind] = useState<Scene | "">(reminder?.backgroundKind ?? "");
  const [image, setImage] = useState(reminder?.backgroundImage ?? "");
  const [imageUrl, setImageUrl] = useState(image.startsWith("https://") ? image : "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [animate, setAnimate] = useState(true);
  const sample = useRef<HTMLDivElement>(null);
  const upload = useRef<HTMLInputElement>(null);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); onBusy(true); setMessage("正在准备背景图片…");
    try { setImage(await compressImage(file)); setImageUrl(""); setMessage(`已选择 ${file.name}，保存习惯后生效。`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "暂时无法读取图片。"); }
    finally { setBusy(false); onBusy(false); if (upload.current) upload.current.value = ""; }
  }
  function applyUrl() {
    const url = imageUrl.trim();
    if (!url || !isBackgroundImage(url) || !url.startsWith("https://")) { setMessage("请输入有效的 HTTPS 图片网址。"); return; }
    setImage(url); setMessage("背景图片已更新，保存习惯后生效。");
  }
  function downloadStatic() {
    const svg = sample.current?.querySelector("svg");
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "960"); clone.setAttribute("height", "720");
    clone.removeAttribute("class");
    clone.querySelectorAll("[class],[style]").forEach(element => { element.removeAttribute("class"); element.removeAttribute("style"); });
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `ottlog-habit-${kind}.svg`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <fieldset className={styles.appearance}>
    <legend>习惯的样子</legend>
    <input type="hidden" name="kind" value={kind} />
    <input type="hidden" name="backgroundKind" value={backgroundKind} />
    <input type="hidden" name="backgroundImage" value={image} />
    <div className={styles.appearanceTop}>
      <div className={styles.scenePreview} ref={sample}>
        <ReminderScene kind={kind} staticImage={!animate} />
        <div className={styles.previewControls}><button type="button" aria-pressed={animate} onClick={() => setAnimate(value => !value)}>{animate ? "动效预览" : "静态预览"}</button><button type="button" onClick={downloadStatic}>下载静态图</button></div>
      </div>
      <div className={styles.appearanceCopy}>
        <span className={styles.appearanceIcon}><HabitIcon kind={kind} /></span>
        <strong>{scenes[kind]}</strong>
        <p>30 款主题插画。选择后，习惯图标、提醒动效与静态背景会一同变化。</p>
        <label>卡片背景<select value={image ? "custom" : backgroundKind || "follow"} onChange={event => { if (event.target.value === "custom") return; setImage(""); setBackgroundKind(event.target.value === "follow" ? "" : event.target.value as Scene); }}><option value="follow">跟随关联动效</option>{Object.entries(scenes).map(([scene, label]) => <option key={scene} value={scene}>{label}</option>)}{image && <option value="custom">自定义图片</option>}</select></label>
      </div>
    </div>
    <details className={styles.sceneLibrary}>
      <summary>选择主题插画 <span>30 款 / 每款都有动静版本</span></summary>
      <div className={styles.sceneGallery} role="group" aria-label="主题插画图库">
        {Object.entries(scenes).map(([scene, label]) => <button type="button" key={scene} aria-label={`选择${label}插画`} aria-pressed={kind === scene} onClick={() => setKind(scene as Scene)}><ReminderScene kind={scene} staticImage /><span>{label}</span>{kind === scene && <b aria-hidden="true">✓</b>}</button>)}
      </div>
    </details>
    <div className={styles.customBackground}>
      <div className={styles.backgroundSample}>{image ? <img src={image} alt="自定义背景预览" onError={event => { event.currentTarget.style.visibility = "hidden"; setMessage("这个网址的图片暂时无法显示，请检查图片地址。"); }} onLoad={event => { event.currentTarget.style.visibility = "visible"; }} /> : <ReminderScene kind={backgroundKind || kind} staticImage />}</div>
      <div className={styles.backgroundTools}>
        <strong>也可以用自己的图片</strong>
        <label>图片网址<div className={styles.urlField}><input type="url" value={imageUrl} maxLength={2048} placeholder="https://…" onChange={event => setImageUrl(event.target.value)} /><button type="button" disabled={busy} onClick={applyUrl}>使用网址</button></div></label>
        <div className={styles.backgroundActions}><button type="button" disabled={busy} onClick={() => upload.current?.click()}>{busy ? "准备图片中…" : "＋ 选择本地图片"}</button>{image && <button type="button" disabled={busy} onClick={() => { setImage(""); setImageUrl(""); setMessage("已恢复插画背景。"); }}>恢复插画</button>}</div>
        <input className={styles.fileInput} ref={upload} type="file" accept="image/png,image/jpeg,image/webp" aria-label="上传习惯背景图片" onChange={chooseFile} />
        <p className={styles.imageNotice} role="status">{message || "JPG / PNG / WebP。图片会压缩为背景缩略图，与习惯一起保存和备份。"}</p>
      </div>
    </div>
  </fieldset>;
}
