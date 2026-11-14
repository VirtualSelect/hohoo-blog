"use client";
import ThemeArtwork from "./ThemeArtwork";
import { useText } from "./Shell";
import styles from "./SignalSculpture.module.css";
export default function SignalSculpture() {
  const t = useText();
  return (
    <section className={styles.section} aria-labelledby="home-artwork-title">
      <header className={styles.header}>
        <p>INTERACTIVE SCULPTURE / AI LAB</p>
        <h2 id="home-artwork-title">
          {t("让想法成为形状", "Give ideas a form", "讓想法成為形狀")}
        </h2>
        <span>
          {t(
            "可交互概念装置 · 非实验数据",
            "Interactive concept artwork · Not experimental data",
            "可互動概念裝置 · 非實驗數據",
          )}
        </span>
      </header>
      <div className={styles.stage}>
        <ThemeArtwork context="home" />
      </div>
    </section>
  );
}
