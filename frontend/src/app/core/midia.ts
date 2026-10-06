/**
 * Converte links do YouTube/Vimeo em URL de incorporação.
 * Retorna null para qualquer outro endereço (o backend aplica a mesma regra).
 */
export function urlIncorporacao(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^(www|m)\./, '');
  let id: string | null = null;

  if (host === 'youtu.be') {
    id = u.pathname.slice(1).split('/')[0] || null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = u.pathname === '/watch' ? u.searchParams.get('v') : (/^\/(?:shorts|embed|live)\/([\w-]+)/.exec(u.pathname)?.[1] ?? null);
  }
  if (id && /^[\w-]{6,20}$/.test(id)) {
    return `https://www.youtube-nocookie.com/embed/${id}`;
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const vimeo = /^\/(?:video\/)?(\d+)/.exec(u.pathname)?.[1];
    if (vimeo) return `https://player.vimeo.com/video/${vimeo}`;
  }
  return null;
}

/** Escolhe preto ou branco para o texto conforme o contraste com a cor de fundo (WCAG). */
export function corTextoPara(fundo: string | null | undefined): string {
  const m = /^#([0-9a-f]{6})$/i.exec(fundo ?? '');
  if (!m) return '#111111';
  const n = parseInt(m[1], 16);
  const canal = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
  const contrasteBranco = 1.05 / (l + 0.05);
  const contrastePreto = (l + 0.05) / 0.05;
  return contrasteBranco > contrastePreto ? '#ffffff' : '#111111';
}
