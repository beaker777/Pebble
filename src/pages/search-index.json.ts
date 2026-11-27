import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { VOLUMES } from '../data/volumes';
import { buildVolumeChapters } from '../utils/chapters';

export const GET: APIRoute = async () => {
  const [allNotes, allChapterConfigs] = await Promise.all([
    getCollection('notes'),
    getCollection('chapterConfigs'),
  ]);
  const items = [];

  for (const vol of VOLUMES) {
    const { flatArticles } = buildVolumeChapters(vol, allNotes, allChapterConfigs);
    for (const entry of flatArticles) {
      items.push({
        slug: entry.note.id,
        title: entry.note.data.title,
        volume: vol.id,
        volumeNumber: `VOL. ${vol.number}`,
        volumeTitle: vol.title,
        volumeColor: vol.coverBg,
        chapter: entry.chapterTitle,
        sectionCode: entry.sectionCode,
        tags: entry.note.data.tags,
      });
    }
  }

  return new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
