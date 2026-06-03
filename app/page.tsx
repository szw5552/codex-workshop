import Image from 'next/image';
import Link from 'next/link';
import events from '@/content/index.json';

type EventSummary = {
  slug: string;
  title: string;
  date: string;
  processedAt: string;
  description?: string;
  summary?: string;
  cover?: { src: string; alt: string; width: number; height: number } | null;
  photoCount: number;
  keyPointCount: number;
};

const archive = events as EventSummary[];

function summaryLead(summary?: string) {
  return summary?.split('\n').map((paragraph) => paragraph.trim()).filter(Boolean)[0] || '';
}

export default function Home() {
  const [featured, ...rest] = archive;

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="wordmark" href="/">Talk Archive</Link>
        <p className="header-note">從錄音、照片到可共享的演講紀錄。放進 upload，產出團隊能讀的長文頁。</p>
      </header>

      {!featured ? (
        <section className="empty-state">
          <p className="kicker">尚未處理任何演講</p>
          <h1>把同一場演講的錄音與照片放進 upload。</h1>
          <p className="lede">接著執行 <code>npm run process-upload</code>。完成後，這裡會出現多場演講列表，每場都有照片、摘要、資訊圖與完整潤飾逐字稿。</p>
        </section>
      ) : (
        <>
          <section className="hero">
            <div>
              <p className="kicker">最新紀錄 · {featured.date}</p>
              <h1>{featured.title}</h1>
              <p className="lede">{featured.description || summaryLead(featured.summary)}</p>
            </div>
            <Link className="meta-panel" href={`/talks/${featured.slug}`}>
              <p>閱讀完整紀錄</p>
              <p>{featured.photoCount} 張照片</p>
              <p>{featured.keyPointCount} 個重點</p>
            </Link>
          </section>

          {featured.cover && (
            <Link className="photo-frame" style={{ marginBottom: 56 }} href={`/talks/${featured.slug}`}>
              <Image src={featured.cover.src} alt={featured.cover.alt} fill sizes="100vw" priority />
            </Link>
          )}

          <section className="archive-list" aria-label="演講列表">
            {[featured, ...rest].map((event) => (
              <Link className="archive-row" href={`/talks/${event.slug}`} key={event.slug}>
                <div>
                  <h2>{event.title}</h2>
                  <p>{event.description || summaryLead(event.summary)}</p>
                </div>
                <time>{event.date}</time>
                <span className="badge">{event.photoCount} photos</span>
              </Link>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
