"use client";

import { useRef, useState } from "react";
import styles from "./sort-direction.module.css";

export default function SortDirection({ value, onChange, autoSubmit = false }: {
  value: "asc" | "desc";
  onChange?: (value: "asc" | "desc") => void;
  autoSubmit?: boolean;
}) {
  const [localDirection, setLocalDirection] = useState(value);
  const input = useRef<HTMLInputElement>(null);
  const direction = onChange ? value : localDirection;
  const next = direction === "asc" ? "desc" : "asc";
  const label = direction === "asc" ? "当前升序，点击切换为降序" : "当前降序，点击切换为升序";

  return <fieldset className={styles.direction}>
    <legend>顺序</legend>
    <input ref={input} type="hidden" name="direction" value={direction} />
    <button type="button" className={styles.toggle} aria-label={label} title={label} onClick={() => {
      setLocalDirection(next);
      onChange?.(next);
      if (input.current) {
        // Submit the new value immediately, before React commits the state update.
        input.current.value = next;
        if (autoSubmit) input.current.form?.requestSubmit();
      }
    }}><span aria-hidden="true">{direction === "asc" ? "↑" : "↓"}</span></button>
  </fieldset>;
}
