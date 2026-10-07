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

/** Cores sugeridas para a fonte. "Automática" (preto ou branco pelo contraste) é oferecida à parte. */
export const CORES_TEXTO = [
  { cor: '#111111', nome: 'Preto' },
  { cor: '#ffffff', nome: 'Branco' },
  { cor: '#a013ad', nome: 'Magenta escuro' },
  { cor: '#5b2c87', nome: 'Roxo' },
  { cor: '#f2c200', nome: 'Amarelo' },
];

/**
 * Fontes do editor. O valor vira a classe "ql-font-<valor>" no HTML salvo.
 * A família e o nome exibido de cada uma ficam em styles/_fontes.scss; as do Google Fonts
 * são carregadas no index.html (o navegador só baixa as que aparecem na tela).
 * Não remova valores já usados: textos antigos voltariam para a fonte padrão.
 */
export const FONTES = [
  'atkinson',
  'lexend',
  'trebuchet',
  'arial',
  'verdana',
  'roboto',
  'open-sans',
  'lato',
  'montserrat',
  'poppins',
  'serif',
  'times',
  'merriweather',
  'lora',
  'playfair',
  'oswald',
  'dancing',
  'pacifico',
  'monospace',
];

export const OPCOES_QUILL: CustomOption[] = [{ import: 'formats/font', whitelist: FONTES }];

/** Barra de ferramentas do editor. Sem botão de imagem/vídeo: mídias entram pelos campos 4 e 5. */
export const MODULOS_QUILL: QuillModules = {
  toolbar: [
    [
      { font: [false, ...FONTES] },
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
