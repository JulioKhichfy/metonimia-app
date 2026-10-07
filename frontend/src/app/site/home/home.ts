import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CONTATO } from '../../core/config';
import { dadosEstruturados, PERGUNTAS, SERVICOS } from '../../core/seo';
import { Agenda } from '../agenda/agenda';

const ID_JSON_LD = 'dados-estruturados';

type EstadoEnvio = 'parado' | 'enviando' | 'ok' | 'erro';

interface RespostaFormSubmit {
  success?: string | boolean;
  message?: string;
}

@Component({
  selector: 'app-home',
  imports: [ReactiveFormsModule, Agenda],
  templateUrl: './home.html',
})
export class Home {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = viewChild<ElementRef<HTMLElement>>('feedback');

  protected readonly contato = CONTATO;
  protected readonly servicos = SERVICOS;
  protected readonly perguntas = PERGUNTAS;
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
    // Dados estruturados (schema.org) no <head>. Gravados no HTML durante a pré-renderização;
    // no navegador o script já existe e não é duplicado.
    const doc = inject(DOCUMENT);
    if (!doc.getElementById(ID_JSON_LD)) {
      const script = doc.createElement('script');
      script.type = 'application/ld+json';
      script.id = ID_JSON_LD;
      script.textContent = JSON.stringify(dadosEstruturados()).replace(/</g, '\\u003c');
      doc.head.appendChild(script);
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
