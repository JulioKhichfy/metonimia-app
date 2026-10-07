import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, HostListener, PLATFORM_ID, effect, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CONTATO } from '../../core/config';
import { Pergunta, Servico } from '../../core/models';
import { PerguntaService } from '../../core/pergunta.service';
import { ancoraServico, dadosEstruturados, PERGUNTAS_PADRAO, SERVICOS_PADRAO } from '../../core/seo';
import { ServicoService } from '../../core/servico.service';
import { Agenda } from '../agenda/agenda';
import { VideoDestaque } from '../video-destaque/video-destaque';

const ID_JSON_LD = 'dados-estruturados';

type EstadoEnvio = 'parado' | 'enviando' | 'ok' | 'erro';

interface RespostaFormSubmit {
  success?: string | boolean;
  message?: string;
}

@Component({
  selector: 'app-home',
  imports: [ReactiveFormsModule, Agenda, VideoDestaque],
  templateUrl: './home.html',
})
export class Home {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = viewChild<ElementRef<HTMLElement>>('feedback');

  protected readonly contato = CONTATO;
  /** Começam com o retrato do build (HTML pré-renderizado) e são trocados pelas listas da API no navegador. */
  protected readonly servicos = signal<Servico[]>(SERVICOS_PADRAO);
  protected readonly perguntas = signal<Pergunta[]>(PERGUNTAS_PADRAO);
  protected readonly ancoraServico = ancoraServico;
  protected readonly whatsappUrl = `https://wa.me/${CONTATO.whatsappNumero}?text=${encodeURIComponent(CONTATO.whatsappMensagem)}`;
  protected readonly ano = new Date().getFullYear();

  protected readonly menuAberto = signal(false);
  protected readonly estado = signal<EstadoEnvio>('parado');
  protected readonly mensagem = signal('');

  protected readonly menu = [
    { href: '#servicos', texto: 'Serviços' },
    { href: '#missao', texto: 'Missão' },
    { href: '#visao', texto: 'Visão' },
    { href: '#proposito', texto: 'Propósito' },
    { href: '#diversidade', texto: 'Diversidade' },
    { href: '#profissionalismo', texto: 'Profissionalismo' },
    { href: '#inclusao', texto: 'Inclusão' },
    { href: '#simplicidade', texto: 'Simplicidade' },
    { href: '#impacto', texto: 'Impacto Social' },
    { href: '#compromisso', texto: 'Compromisso Social' },
    { href: '#palestras', texto: 'Palestras' },
    { href: '#eventos', texto: 'Eventos' },
    { href: '#manifesto', texto: 'Manifesto' },
    { href: '#perguntas', texto: 'Perguntas frequentes' },
    { href: '#contato', texto: 'Fale Conosco' },
  ];

  constructor() {
    // Dados estruturados (schema.org) no <head>: gravados no HTML durante a pré-renderização e
    // atualizados no navegador quando a lista de serviços chega da API.
    const doc = inject(DOCUMENT);
    effect(() => {
      let script = doc.getElementById(ID_JSON_LD);
      if (!script) {
        script = doc.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.id = ID_JSON_LD;
        doc.head.appendChild(script);
      }
      script.textContent = JSON.stringify(dadosEstruturados(this.servicos(), this.perguntas())).replace(/</g, '\\u003c');
    });

    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      // Em caso de erro, mantém o retrato do build
      const subs = [
        inject(ServicoService).listarPublicos().subscribe({ next: (l) => this.servicos.set(l), error: () => {} }),
        inject(PerguntaService).listarPublicas().subscribe({ next: (l) => this.perguntas.set(l), error: () => {} }),
      ];
      inject(DestroyRef).onDestroy(() => subs.forEach((s) => s.unsubscribe()));
    }
  }

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.maxLength(5000)]],
    _honey: [''], // armadilha para robôs: fica escondido
  });

  protected alternarMenu(): void {
    this.menuAberto.update((v) => !v);
  }

  protected fecharMenu(): void {
    this.menuAberto.set(false);
  }

  @HostListener('document:keydown.escape')
  protected aoPressionarEsc(): void {
    this.fecharMenu();
  }

  protected enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.form.controls._honey.value) return;

    this.estado.set('enviando');
    const { name, email, message } = this.form.getRawValue();
    this.http
      .post<RespostaFormSubmit>(
        `https://formsubmit.co/ajax/${CONTATO.email}`,
        {
          name,
          email,
          message,
          _subject: 'Novo contato pelo site Metonímia',
          _template: 'table',
          _replyto: email,
        },
        { headers: { Accept: 'application/json' } },
      )
      .subscribe({
        next: (r) => {
          const ok = r.success === true || r.success === 'true';
          this.mostrar(ok ? 'ok' : 'erro', ok
            ? 'Obrigado por entrar em contato, iremos responder ;)'
            : 'Algo deu errado ao enviar. Tente novamente ou use o WhatsApp.');
          if (ok) this.form.reset();
        },
        error: () => this.mostrar('erro', 'Sem conexão no momento. Tente novamente ou use o WhatsApp.'),
      });
  }

  private mostrar(estado: EstadoEnvio, mensagem: string): void {
    this.estado.set(estado);
    this.mensagem.set(mensagem);
    setTimeout(() => this.feedback()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }
}
