import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { QuillEditorComponent } from 'ngx-quill';
import { contraste, corTextoPara, urlIncorporacao } from '../../core/midia';
import { Midia, Publicacao, PublicacaoPayload, ROTULOS, TipoPublicacao } from '../../core/models';
import { PublicacaoService } from '../../core/publicacao.service';
import { normalizarLinkRede, REDES, validadorLinkRede } from '../../core/redes';
import { LIMITE_IMAGEM_MB, LIMITE_VIDEO_MB, UploadService } from '../../core/upload.service';
import { LogoRede } from '../../shared/logo-rede';
import { CORES_TEXTO, FUNDOS, MODULOS_QUILL, OPCOES_QUILL } from './editor-config';
import { SeletorCor } from './seletor-cor';

const [YOUTUBE, INSTAGRAM, X] = REDES;

interface UploadEmAndamento {
  id: number;
  nome: string;
  progresso: number;
}

let proximoUpload = 0;

@Component({
  selector: 'app-publicacao-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatTimepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    QuillEditorComponent,
    SeletorCor,
    LogoRede,
  ],
  templateUrl: './publicacao-form.html',
})
export class PublicacaoForm implements OnInit {
  private readonly service = inject(PublicacaoService);
  private readonly uploads = inject(UploadService);

  readonly tipo = input.required<TipoPublicacao>();
  /** Quando informado, o formulário edita; caso contrário, cria. */
  readonly publicacao = input<Publicacao | null>(null);
  readonly salvo = output<Publicacao>();
  readonly cancelado = output<void>();

  protected readonly r = computed(() => ROTULOS[this.tipo()]);
  protected readonly fundos = FUNDOS;
  protected readonly coresTexto = CORES_TEXTO;
  protected readonly redes = REDES;
  protected readonly modulosQuill = MODULOS_QUILL;
  protected readonly opcoesQuill = OPCOES_QUILL;
  protected readonly limiteImagemMb = LIMITE_IMAGEM_MB;
  protected readonly limiteVideoMb = LIMITE_VIDEO_MB;

  protected readonly form = inject(FormBuilder).group({
    data: new FormControl<Date | null>(null, Validators.required),
    hora: new FormControl<Date | null>(null, Validators.required),
    local: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(300)] }),
    corFundo: new FormControl('#f6eef8', { nonNullable: true, validators: Validators.pattern(/^#[0-9a-fA-F]{6}$/) }),
    /** Null = automática. */
    corTexto: new FormControl<string | null>(null, Validators.pattern(/^#[0-9a-fA-F]{6}$/)),
    descricaoHtml: new FormControl<string | null>(''),
    linkYoutube: new FormControl('', { nonNullable: true, validators: validadorLinkRede(YOUTUBE) }),
    linkInstagram: new FormControl('', { nonNullable: true, validators: validadorLinkRede(INSTAGRAM) }),
    linkX: new FormControl('', { nonNullable: true, validators: validadorLinkRede(X) }),
  });
  protected readonly linkVideo = new FormControl('', { nonNullable: true });

  protected readonly midias = signal<Midia[]>([]);
  protected readonly fotos = computed(() => this.comIndice('IMAGEM'));
  protected readonly videos = computed(() => this.comIndice('VIDEO', 'VIDEO_LINK'));
  protected readonly enviando = signal<UploadEmAndamento[]>([]);
  protected readonly salvando = signal(false);
  protected readonly erro = signal('');
  protected readonly erroLink = signal('');

  private readonly corFundo = toSignal(this.form.controls.corFundo.valueChanges, { initialValue: '#f6eef8' });
  private readonly corTextoEscolhida = toSignal(this.form.controls.corTexto.valueChanges, { initialValue: null });
  protected readonly corTextoAutomatica = computed(() => corTextoPara(this.corFundo()));
  protected readonly corTexto = computed(() => this.corTextoEscolhida() ?? this.corTextoAutomatica());
  /** WCAG AA pede 4,5:1 para texto normal. */
  protected readonly contrasteBaixo = computed(() => {
    const razao = contraste(this.corFundo(), this.corTexto());
    return razao < 4.5 ? razao.toFixed(1).replace('.', ',') : null;
  });
  protected readonly estiloEditor = computed(() => ({
    backgroundColor: this.corFundo(),
    color: this.corTexto(),
    minHeight: '180px',
    fontSize: '1rem',
  }));

  ngOnInit(): void {
    const p = this.publicacao();
    if (p) {
      const quando = new Date(p.dataHora);
      this.form.setValue({
        data: quando,
        hora: quando,
        local: p.local,
        corFundo: p.corFundo || '#f6eef8',
        corTexto: p.corTexto ?? null,
        descricaoHtml: p.descricaoHtml ?? '',
        linkYoutube: p.linkYoutube ?? '',
        linkInstagram: p.linkInstagram ?? '',
        linkX: p.linkX ?? '',
      });
      this.midias.set(p.midias.map((m) => ({ ...m })));
    }
  }

  // ---------- Fotos e vídeos ----------

  protected aoEscolherArquivos(evento: Event, tipo: 'IMAGEM' | 'VIDEO'): void {
    const campo = evento.target as HTMLInputElement;
    const arquivos = Array.from(campo.files ?? []);
    campo.value = '';
    this.erro.set('');
    for (const arquivo of arquivos) {
      const limite = (tipo === 'IMAGEM' ? LIMITE_IMAGEM_MB : LIMITE_VIDEO_MB) * 1024 * 1024;
      const esperado = tipo === 'IMAGEM' ? 'image/' : 'video/';
      if (!arquivo.type.startsWith(esperado)) {
        this.erro.set(`"${arquivo.name}" não é ${tipo === 'IMAGEM' ? 'uma imagem' : 'um vídeo'}.`);
        continue;
      }
      if (arquivo.size > limite) {
        this.erro.set(`"${arquivo.name}" passa do limite de ${limite / 1024 / 1024} MB.`);
        continue;
      }
      this.enviar(arquivo);
    }
  }

  private enviar(arquivo: File): void {
    const id = ++proximoUpload;
    this.enviando.update((l) => [...l, { id, nome: arquivo.name, progresso: 0 }]);
    const remover = () => this.enviando.update((l) => l.filter((u) => u.id !== id));
    this.uploads.enviar(arquivo).subscribe({
      next: ({ progresso, midia }) => {
        this.enviando.update((l) => l.map((u) => (u.id === id ? { ...u, progresso } : u)));
        if (midia) this.midias.update((l) => [...l, { ...midia, descricao: '' }]);
      },
      error: (e: HttpErrorResponse) => {
        remover();
        this.erro.set(`Falha ao enviar "${arquivo.name}": ${mensagemDeErro(e)}`);
      },
      complete: remover,
    });
  }

  protected adicionarLink(): void {
    const url = this.linkVideo.value.trim();
    if (!urlIncorporacao(url)) {
      this.erroLink.set('Cole um link do YouTube ou do Vimeo, por exemplo https://youtu.be/abc123.');
      return;
    }
    this.erroLink.set('');
    this.midias.update((l) => [...l, { tipo: 'VIDEO_LINK', url, descricao: '' }]);
    this.linkVideo.reset();
  }

  protected removerMidia(indice: number): void {
    this.midias.update((l) => l.filter((_, i) => i !== indice));
  }

  protected descreverMidia(indice: number, evento: Event): void {
    const descricao = (evento.target as HTMLInputElement).value;
    this.midias.update((l) => l.map((m, i) => (i === indice ? { ...m, descricao } : m)));
  }

  // ---------- Salvar ----------

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.erro.set('Revise os campos destacados.');
      return;
    }
    const v = this.form.getRawValue();
    const d = v.data!;
    const h = v.hora!;
    const quando = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h.getHours(), h.getMinutes(), 0, 0);

    const payload: PublicacaoPayload = {
      tipo: this.tipo(),
      dataHora: quando.toISOString(),
      local: v.local.trim(),
      descricaoHtml: v.descricaoHtml ?? '',
      corFundo: v.corFundo,
      corTexto: v.corTexto,
      linkYoutube: normalizarLinkRede(v.linkYoutube, YOUTUBE),
      linkInstagram: normalizarLinkRede(v.linkInstagram, INSTAGRAM),
      linkX: normalizarLinkRede(v.linkX, X),
      midias: this.midias(),
    };

    this.salvando.set(true);
    this.erro.set('');
    const p = this.publicacao();
    const req = p ? this.service.atualizar(p.id, payload) : this.service.criar(payload);
    req.subscribe({
      next: (resultado) => {
        this.salvando.set(false);
        this.salvo.emit(resultado);
      },
      error: (e: HttpErrorResponse) => {
        this.salvando.set(false);
        this.erro.set(`Não foi possível salvar: ${mensagemDeErro(e)}`);
      },
    });
  }

  private comIndice(...tipos: Midia['tipo'][]): { midia: Midia; indice: number }[] {
    return this.midias()
      .map((midia, indice) => ({ midia, indice }))
      .filter(({ midia }) => tipos.includes(midia.tipo));
  }
}

function mensagemDeErro(e: HttpErrorResponse): string {
  if (e.status === 0) return 'sem conexão com o servidor.';
  if (e.status === 413) return 'arquivo grande demais.';
  const detalhe = (e.error as { detail?: string } | null)?.detail;
  return detalhe ?? `erro ${e.status}.`;
}
