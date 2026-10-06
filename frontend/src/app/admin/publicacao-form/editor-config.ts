import { CustomOption, QuillModules } from 'ngx-quill/config';

/** Cores da marca primeiro, depois uma paleta neutra/complementar. */
export const PALETA = [
  '#cf2ee0',
  '#a013ad',
  '#111111',
  '#ffffff',
  '#f6eef8',
  '#e7d6ec',
  '#2a2a2a',
  '#555555',
  '#888888',
  '#cccccc',
  '#b3261e',
  '#e8710a',
  '#f2c200',
  '#1e8e3e',
  '#1a73e8',
  '#5b2c87',
];

/** Cores sugeridas para o plano de fundo da palestra/evento. */
export const FUNDOS = [
  { cor: '#ffffff', nome: 'Branco' },
  { cor: '#f6eef8', nome: 'Lavanda' },
  { cor: '#cf2ee0', nome: 'Magenta' },
  { cor: '#a013ad', nome: 'Magenta escuro' },
  { cor: '#111111', nome: 'Preto' },
];

export const OPCOES_QUILL: CustomOption[] = [
  { import: 'formats/font', whitelist: ['trebuchet', 'serif', 'monospace'] },
];

/** Barra de ferramentas do editor. Sem botão de imagem/vídeo: mídias entram pelos campos 4 e 5. */
export const MODULOS_QUILL: QuillModules = {
  toolbar: [
    [
      { font: [false, 'trebuchet', 'serif', 'monospace'] },
      { size: ['small', false, 'large', 'huge'] },
    ],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: PALETA }, { background: PALETA }],
    [{ header: [2, 3, false] }],
    [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['link', 'blockquote'],
    ['clean'],
  ],
};
