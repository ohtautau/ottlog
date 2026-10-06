"use client";

import { useId, useState } from "react";

export default function CategoryPicker({ value, categories, onChange }: { value: string; categories: string[]; onChange: (value: string) => void }) {
  const selectId = useId();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const options = Array.from(new Set([...categories, value].filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"));
  function confirm() {
    const normalized = name.trim();
    if (!normalized) { setError("请填写分类名称"); return; }
    const existing = options.find(option => option.toLocaleLowerCase() === normalized.toLocaleLowerCase());
    onChange(existing || normalized);
    setCreating(false); setName(""); setError("");
  }
  return <div className="category-picker">
    <label htmlFor={selectId}>分类</label><select id={selectId} required value={value} onChange={event => onChange(event.target.value)}><option value="" disabled>请选择分类</option>{options.map(option => <option key={option} value={option}>{option}</option>)}</select>
    {!creating ? <button type="button" onClick={() => setCreating(true)}>＋ 新建分类</button> : <div className="category-create">
      <label>新分类名称<input autoFocus maxLength={50} value={name} onChange={event => { setName(event.target.value); setError(""); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); confirm(); } }} placeholder="输入分类名称" /></label>
      <div className="admin-actions"><button type="button" onClick={confirm}>使用此分类</button><button type="button" onClick={() => { setCreating(false); setName(""); setError(""); }}>取消</button></div>
      {error && <p role="alert" className="hint">{error}</p>}
      <p className="hint">同名分类会直接选中，新分类随文章保存。</p>
    </div>}
  </div>;
}
