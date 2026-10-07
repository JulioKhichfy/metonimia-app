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

export const COR_HEX = /^#[0-9a-f]{6}$/i;

/** Escolhe preto ou branco para o texto conforme o contraste com a cor de fundo (WCAG). */
export function corTextoPara(fundo: string | null | undefined): string {
  if (!COR_HEX.test(fundo ?? '')) return '#111111';
  return contraste(fundo!, '#ffffff') > contraste(fundo!, '#111111') ? '#ffffff' : '#111111';
}

/** Razão de contraste WCAG entre duas cores #rrggbb (1 a 21). */
export function contraste(a: string, b: string): number {
  const [la, lb] = [luminancia(a), luminancia(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Cor intermediária entre duas cores #rrggbb (proporcao 0 = a, 1 = b). */
export function misturar(a: string, b: string, proporcao = 0.5): string {
  const ca = canais(a);
  const cb = canais(b);
  return '#' + ca.map((c, i) => Math.round(c + (cb[i] - c) * proporcao).toString(16).padStart(2, '0')).join('');
}

/**
 * Normaliza o que foi digitado num campo de cor: aceita "#abc", "abc", "#aabbcc" ou "aabbcc".
 * Retorna "#rrggbb" em minúsculas, ou null se não for uma cor válida.
 */
export function normalizarHex(texto: string): string | null {
  let t = texto.trim().toLowerCase();
  if (!t.startsWith('#')) t = '#' + t;
  if (/^#[0-9a-f]{3}$/.test(t)) t = '#' + [...t.slice(1)].map((c) => c + c).join('');
  return COR_HEX.test(t) ? t : null;
}

function canais(cor: string): [number, number, number] {
  const n = parseInt(cor.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminancia(cor: string): number {
  const canal = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = canais(cor);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}
