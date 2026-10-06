"use client";

import { useEffect, useState } from "react";
import styles from "./background-meteors.module.css";

export default function BackgroundMeteors() {
  const [paused,setPaused]=useState(true);
  useEffect(()=>{
    const update=()=>setPaused(document.hidden);
    update();document.addEventListener("visibilitychange",update);
    return()=>document.removeEventListener("visibilitychange",update);
  },[]);
  return <div className={styles.sky} aria-hidden="true" data-paused={paused}>
    <span className={styles.meteor}><i /></span>
    <span className={styles.meteor}><i /></span>
    <span className={styles.meteor}><i /></span>
  </div>;
}
