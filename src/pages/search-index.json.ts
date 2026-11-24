import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { VOLUME_MAP } from '../data/volumes';

export const GET: APIRoute = async () => {
  const notes = await getCollection('notes');

  const items = notes
    .sort((a, b) => {
      if (a.data.volume !== b.data.volume) {
        return a.data.volume.localeCompare(b.data.volume);
      }
      return a.data.order - b.data.order;
    })
    .map((note) => {
      const vol = VOLUME_MAP[note.data.volume];
      return {
        slug: note.id,
        title: note.data.title,
        summary: note.data.summary,
        volume: note.data.volume,
        volumeNumber: `VOL. ${vol.number}`,
        volumeTitle: vol.title,
        volumeColor: vol.coverBg,
        frequency: note.data.frequency,
        tags: note.data.tags,
      };
    });

  return new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
