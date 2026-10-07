import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Publicacao } from './models';

export type RedeSocial = 'youtube' | 'instagram' | 'x';

export interface ConfigRede {
  id: RedeSocial;
  nome: string;
  campo: 'linkYoutube' | 'linkInstagram' | 'linkX';
  dominios: string[];
  exemplo: string;
}

/** Mesma regra do backend (RedeSocialValidator). */
export const REDES: ConfigRede[] = [
  { id: 'youtube', nome: 'YouTube', campo: 'linkYoutube', dominios: ['youtube.com', 'youtu.be'], exemplo: 'https://www.youtube.com/@metonimia' },
  { id: 'instagram', nome: 'Instagram', campo: 'linkInstagram', dominios: ['instagram.com'], exemplo: 'https://www.instagram.com/metonimia' },
  { id: 'x', nome: 'X', campo: 'linkX', dominios: ['x.com', 'twitter.com'], exemplo: 'https://x.com/metonimia' },
];

/** Completa "https://" se faltar. Retorna null se vazio ou de outro site. */
export function normalizarLinkRede(texto: string | null | undefined, rede: ConfigRede): string | null {
  const t = (texto ?? '').trim();
  if (!t) return null;
  const url = t.includes('://') ? t : `https://${t}`;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
    return u.protocol === 'https:' && rede.dominios.includes(host) ? url : null;
  } catch {
    return null;
  }
}

export function validadorLinkRede(rede: ConfigRede): ValidatorFn {
  return (c: AbstractControl<string>): ValidationErrors | null =>
    !c.value?.trim() || normalizarLinkRede(c.value, rede) ? null : { linkRede: true };
}

export function redesDa(p: Publicacao): { rede: ConfigRede; url: string }[] {
  return REDES.flatMap((rede) => {
    const url = p[rede.campo];
    return url ? [{ rede, url }] : [];
  });
}
