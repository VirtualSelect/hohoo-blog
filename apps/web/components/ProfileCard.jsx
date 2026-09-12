"use client";
import Image from "next/image";
import Link from "../runtime/Link";
import { useText } from "./Shell";
export default function ProfileCard() {
  const t = useText();
  return (
    <aside
      className="profile-stack"
      aria-label={t("Hohoo 的个人名片", "Hohoo’s profile", "Hohoo 的個人名片")}
    >
      <div className="profile-card">
        <div className="profile-card-top">
          <span className="eyebrow">
            {t("你好，世界_", "HELLO, WORLD_", "你好，世界_")}
          </span>
          <Link
            to="/about"
            aria-label={t("认识 Hohoo", "Meet Hohoo", "認識 Hohoo")}
          >
            ↗
          </Link>
        </div>
        <Image
          className="profile-avatar"
          src="/img/hohoo.jpg"
          alt={t("Hohoo 的小熊头像", "Hohoo’s bear avatar", "Hohoo 的小熊頭像")}
          width={152}
          height={152}
          priority
        />
        <h2>Hohoo</h2>
        <p className="profile-role">
          {t(
            "开发者 · AI 探索者",
            "Developer · AI Explorer",
            "開發者 · AI 探索者",
          )}
        </p>
        <p className="profile-note">
          {t(
            "忙时学习，闲时读书。",
            "Learning, reading, making.",
            "忙時學習，閒時讀書。",
          )}
          <br />
          {t(
            "在热爱的事情里，慢慢积累。",
            "Making time for what matters.",
            "在熱愛的事情裡，慢慢積累。",
          )}
        </p>
        <div className="profile-card-bottom">
          <span>
            {t(
              "学习 · 实践 · 分享",
              "Learn · Build · Share",
              "學習 · 實作 · 分享",
            )}
          </span>
          <a href="https://github.com/VirtualSelect">GitHub ↗</a>
        </div>
      </div>
    </aside>
  );
}
