import { Pipe, PipeTransform } from '@angular/core';
import { FUSO_HORARIO } from '../core/config';

const longa = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_HORARIO,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const curta = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_HORARIO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const hora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_HORARIO,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * Formata datas sempre no horário de Brasília, independente do fuso de quem acessa.
 * 'longa' → "terça-feira, 6 de outubro de 2026, às 19h00"
 * 'curta' → "06/10/2026 às 19:00"
 */
@Pipe({ name: 'dataHora' })
export class DataHoraPipe implements PipeTransform {
  transform(iso: string | null | undefined, modo: 'longa' | 'curta' = 'curta'): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const h = hora.format(d);
    return modo === 'longa' ? `${longa.format(d)}, às ${h.replace(':', 'h')}` : `${curta.format(d)} às ${h}`;
  }
}
