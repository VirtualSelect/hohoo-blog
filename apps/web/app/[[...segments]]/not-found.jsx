import Link from "next/link";
export default function NotFound() {
  return (
    <main className="hh-page">
      <p className="eyebrow">404</p>
      <h1>这页还没有留下足迹。</h1>
      <p>This page could not be found.</p>
      <Link href="/">返回首页 / Home →</Link>
    </main>
  );
}
