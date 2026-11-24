import type { CollectionEntry } from 'astro:content';
import type { ChapterMeta, VolumeMeta } from '../data/volumes';

export interface ChapterArticle {
  note: CollectionEntry<'notes'>;
  chapterIndex: number;
  articleIndex: number;
  sectionCode: string; // e.g. "1.1", "1.2", "2.1"
  chapterTitle: string;
}

export interface ChapterGroup {
  chapterIndex: number; // 1-based
  numberLabel: string;  // "01", "02"
  title: string;
  subtitle?: string;
  items: ChapterArticle[];
}

export interface StructuredVolume {
  chapters: ChapterGroup[];
  flatArticles: ChapterArticle[];
}

/**
 * Group a volume's notes into custom-ordered chapters.
 *
 * Chapter ordering priority (unified across ALL chapters):
 * 1. Explicit `chapterOrder` number in any note's Markdown frontmatter (smallest number in the chapter wins).
 * 2. Top-to-bottom order in `src/content/notes/<volume>/_chapters.yaml` (1, 2, 3...)
 *    — or fallback to `volume.chapters` in `src/data/volumes.ts` if `_chapters.yaml` is absent/empty.
 * 3. Any unlisted chapter without `chapterOrder` is appended at the end, sorted alphabetically.
 */
export function buildVolumeChapters(
  volume: VolumeMeta,
  allNotes: CollectionEntry<'notes'>[],
  allChapterConfigs: CollectionEntry<'chapterConfigs'>[] = []
): StructuredVolume {
  const volNotes = allNotes.filter((n) => n.data.volume === volume.id);

  // Bucket notes by chapter title
  const bucketMap = new Map<string, CollectionEntry<'notes'>[]>();
  for (const note of volNotes) {
    const ch = (note.data.chapter || '核心专题').trim();
    const list = bucketMap.get(ch) || [];
    list.push(note);
    bucketMap.set(ch, list);
  }

  // Sort articles inside each chapter by `order`, then slug
  for (const list of bucketMap.values()) {
    list.sort((a, b) => {
      if (a.data.order !== b.data.order) return a.data.order - b.data.order;
      return a.id.localeCompare(b.id);
    });
  }

  // Resolve declared chapter list: prefer `<volume>/_chapters.yaml`, fallback to `volume.chapters`
  const configEntry = allChapterConfigs.find(
    (entry) => entry.id.split(/[/\\]/)[0] === volume.id
  );
  const declaredChapters: ChapterMeta[] =
    configEntry && configEntry.data.chapters.length > 0
      ? configEntry.data.chapters
      : volume.chapters;

  const declaredMap = new Map<string, { index: number; subtitle?: string }>();
  declaredChapters.forEach((ch, idx) => {
    const key = ch.title.trim();
    if (key && !declaredMap.has(key)) {
      declaredMap.set(key, { index: idx + 1, subtitle: ch.subtitle });
    }
  });

  // Build unified sortable candidates from all non-empty chapter buckets
  const candidates: {
    title: string;
    subtitle?: string;
    sortOrder: number;
    hasExplicitOrder: boolean;
  }[] = [];

  for (const [title, list] of bucketMap.entries()) {
    const explicitOrders = list
      .map((n) => n.data.chapterOrder)
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
    const hasExplicitOrder = explicitOrders.length > 0;
    const declared = declaredMap.get(title);

    const sortOrder = hasExplicitOrder
      ? Math.min(...explicitOrders)
      : declared
        ? declared.index
        : Number.POSITIVE_INFINITY;

    candidates.push({
      title,
      subtitle: declared?.subtitle,
      sortOrder,
      hasExplicitOrder,
    });
  }

  candidates.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    // On numeric tie, explicit frontmatter `chapterOrder` precedes implicit config rank
    if (a.hasExplicitOrder !== b.hasExplicitOrder) return a.hasExplicitOrder ? -1 : 1;
    return a.title.localeCompare(b.title, 'zh-CN');
  });

  const chapters: ChapterGroup[] = [];
  const flatArticles: ChapterArticle[] = [];

  candidates.forEach((meta, idx) => {
    const chapterIndex = idx + 1;
    const rawNotes = bucketMap.get(meta.title) || [];
    const items: ChapterArticle[] = rawNotes.map((note, aIdx) => {
      const articleIndex = aIdx + 1;
      const entry: ChapterArticle = {
        note,
        chapterIndex,
        articleIndex,
        sectionCode: `${chapterIndex}.${articleIndex}`,
        chapterTitle: meta.title,
      };
      flatArticles.push(entry);
      return entry;
    });

    chapters.push({
      chapterIndex,
      numberLabel: String(chapterIndex).padStart(2, '0'),
      title: meta.title,
      subtitle: meta.subtitle,
      items,
    });
  });

  return { chapters, flatArticles };
}
