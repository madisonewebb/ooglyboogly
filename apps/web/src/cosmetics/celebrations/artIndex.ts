/**
 * Real parade art, when saved: apps/web/src/art/celebrations/ghostParade/parade.webp,
 * a wide strip of marching ghosts. Without it the parade draws vector ghosts.
 */
const files = import.meta.glob<string>('../../art/celebrations/ghostParade/parade.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const PARADE_ART: string | undefined = Object.values(files)[0];
