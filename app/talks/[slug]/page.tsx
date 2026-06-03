import { promises as fs } from 'node:fs';
import path from 'node:path';
import Image from 'next/image';
import { ImageLightbox } from '@/app/components/ImageLightbox';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import index from '@/content/index.json';

type Photo = { src: string; alt: string; originalName: string; width: number; height: number };
type Talk = {
  slug: string;
  title: string;
  date: string;
  location?: string;
  description?: string;
  summary: string;
  keyPoints: string[];
  polishedTranscript: string[];
  photos: Photo[];
  infographic?: { src: string; alt: string; width: number; height: number } | null;
};

const contentRoot = path.join(process.cwd(), 'content', 'events');

function summaryParagraphs(summary: string) {
  return summary.split('\n').map((paragraph) => paragraph.trim()).filter(Boolean);
}

function summaryLead(summary: string) {
  return summaryParagraphs(summary)[0] || summary;
}

function normalizeSlug(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

async function getTalk(slug: string): Promise<Talk | null> {
  try {
    const data = await fs.readFile(path.join(contentRoot, `${normalizeSlug(slug)}.json`), 'utf8');
    return JSON.parse(data) as Talk;
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  return (index as { slug: string }[]).map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: routeSlug } = await params;
  const slug = normalizeSlug(routeSlug);
  const talk = await getTalk(slug);
  if (!talk) return {};
  return { title: `${talk.title} · Talk Archive`, description: summaryLead(talk.summary) };
}

export default async function TalkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: routeSlug } = await params;
  const slug = normalizeSlug(routeSlug);
  const talk = await getTalk(slug);
  if (!talk) notFound();

  return (
    <main>
      <div className="page-shell">
        <header className="site-header">
          <Link className="wordmark" href="/">Talk Archive</Link>
          <p className="header-note">{talk.date}{talk.location ? ` · ${talk.location}` : ''}</p>
        </header>

        <section className="hero talk-hero">
          <div>
            <p className="kicker">演講紀錄</p>
            <h1>{talk.title}</h1>
          </div>
          <p className="lede">{talk.description || summaryLead(talk.summary)}</p>
        </section>

        {talk.photos.length > 0 && (
          <section className="photo-mosaic" aria-label="演講照片">
            {talk.photos.map((photo, imageIndex) => (
              <figure className="photo-frame" key={photo.src}>
                <ImageLightbox src={photo.src} alt={photo.alt} caption={photo.originalName}>
                  <Image src={photo.src} alt={photo.alt} fill sizes={imageIndex < 2 ? '50vw' : '33vw'} priority={imageIndex < 2} />
                </ImageLightbox>
              </figure>
            ))}
          </section>
        )}

        <section className="talk-layout">
          <article className="summary-block">
            <h2>重點簡介</h2>
            <div className="prose">
              {summaryParagraphs(talk.summary).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            {talk.infographic && (
              <figure className="infographic summary-infographic">
                <ImageLightbox src={talk.infographic.src} alt={talk.infographic.alt} caption="Codex 根據摘要與逐字稿產生的演講重點資訊圖">
                  <Image src={talk.infographic.src} alt={talk.infographic.alt} width={talk.infographic.width} height={talk.infographic.height} />
                </ImageLightbox>
                <figcaption>Codex 根據摘要與逐字稿產生的演講重點資訊圖</figcaption>
              </figure>
            )}
            <ul className="key-points">
              {talk.keyPoints.map((point) => <li key={point}>{point}</li>)}
            </ul>
          </article>

          <aside className="sidebar" aria-label="閱讀導覽">
            {!talk.infographic && (
              <div className="meta-panel">這場演講的資訊圖尚未產生，但文字重點已可閱讀。</div>
            )}
            <a className="badge" href="#transcript">跳到完整逐字稿</a>
          </aside>
        </section>
      </div>

      <section className="transcript" id="transcript">
        <details className="transcript-dropdown">
          <summary>
            <span>
              <span className="transcript-eyebrow">完整錄音文字</span>
              <strong>展開閱讀完整逐字稿</strong>
            </span>
            <span className="transcript-count">{talk.polishedTranscript.length} 段</span>
          </summary>
          <div className="prose transcript-body">
            {talk.polishedTranscript.map((paragraph, paragraphIndex) => <p key={`${paragraphIndex}-${paragraph.slice(0, 18)}`}>{paragraph}</p>)}
          </div>
        </details>
      </section>

      <footer className="page-shell footer-nav">
        <Link href="/">回到全部演講</Link>
      </footer>
    </main>
  );
}
