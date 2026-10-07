package br.com.metonimia.interprete;

import br.com.metonimia.config.AppProperties;
import br.com.metonimia.interprete.MensagemRequest.Canal;
import br.com.metonimia.interprete.MensagemResponse.LinkWhatsapp;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

/**
 * Envia mensagens aos intérpretes.
 * - E-mail: enviado pelo servidor via SMTP (MAIL_HOST etc. no .env).
 * - WhatsApp: o envio automático exige a API oficial da Meta (conta Business verificada e modelos
 *   aprovados). Por isso o painel recebe um link wa.me por intérprete, com a mensagem já escrita:
 *   basta tocar em "enviar" no WhatsApp.
 * Uma cópia de cada disparo (texto + destinatários) vai para app.mensagens.copia.
 */
@Service
public class MensagemService {

    private static final Logger log = LoggerFactory.getLogger(MensagemService.class);
    private static final String ASSINATURA = "\n\n— Metonímia Produções Acessíveis";
    private static final DateTimeFormatter DATA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy 'às' HH:mm");

    private final InterpreteRepository repositorio;
    private final ObjectProvider<JavaMailSender> mailSender;
    private final Environment env;
    private final String remetente;
    private final String copia;

    public MensagemService(InterpreteRepository repositorio, ObjectProvider<JavaMailSender> mailSender,
            Environment env, AppProperties props) {
        this.repositorio = repositorio;
        this.mailSender = mailSender;
        this.env = env;
        this.remetente = props.mensagens() == null ? null : props.mensagens().remetente();
        this.copia = props.mensagens() == null ? null : props.mensagens().copia();
    }

    /** O e-mail só funciona com um servidor SMTP configurado (MAIL_HOST). */
    public boolean emailConfigurado() {
        return StringUtils.hasText(env.getProperty("spring.mail.host")) && mailSender.getIfAvailable() != null;
    }

    @Transactional(readOnly = true)
    public MensagemResponse enviar(MensagemRequest req) {
        List<Interprete> destinatarios = destinatarios(req);
        String assunto = StringUtils.hasText(req.assunto()) ? req.assunto().strip() : "Mensagem da Metonímia";
        String texto = req.texto().strip();
        boolean porEmail = req.canais().contains(Canal.EMAIL);
        boolean porWhatsapp = req.canais().contains(Canal.WHATSAPP);
        List<String> avisos = new ArrayList<>();

        List<String> enviados = new ArrayList<>();
        List<String> falhas = new ArrayList<>();
        List<String> semEmail = new ArrayList<>();
        if (porEmail) {
            List<Interprete> comEmail = destinatarios.stream().filter(i -> i.getEmail() != null).toList();
            destinatarios.stream().filter(i -> i.getEmail() == null).map(Interprete::getNome).forEach(semEmail::add);
            if (!comEmail.isEmpty() && !emailConfigurado()) {
                avisos.add("O envio de e-mail ainda não está configurado no servidor (MAIL_HOST no .env). "
                        + "Nenhum e-mail foi enviado.");
                comEmail.stream().map(Interprete::getNome).forEach(falhas::add);
            } else if (!comEmail.isEmpty()) {
                enviarEmails(comEmail, assunto, texto, enviados, falhas);
                if (!falhas.isEmpty()) {
                    avisos.add("Alguns e-mails não puderam ser enviados. Confira os endereços e tente de novo.");
                }
            }
        }

        List<LinkWhatsapp> links = new ArrayList<>();
        List<String> semWhatsapp = new ArrayList<>();
        if (porWhatsapp) {
            for (Interprete i : destinatarios) {
                if (i.isCelularWhatsapp()) {
                    links.add(new LinkWhatsapp(i.getId(), i.getNome(), linkWhatsapp(i, texto)));
                } else {
                    semWhatsapp.add(i.getNome());
                }
            }
        }

        String copiaPara = enviarCopia(assunto, texto, enviados, falhas, links, avisos);
        return new MensagemResponse(enviados, falhas, semEmail, links, semWhatsapp, copiaPara, avisos);
    }

    private List<Interprete> destinatarios(MensagemRequest req) {
        if (req.paraTodos()) {
            return repositorio.findAllByOrderByNomeAsc();
        }
        if (req.interpreteIds() == null || req.interpreteIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escolha ao menos um intérprete.");
        }
        List<Interprete> lista = repositorio.findAllById(req.interpreteIds());
        if (lista.size() != req.interpreteIds().stream().distinct().count()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Intérprete não encontrado. Recarregue a página.");
        }
        return lista;
    }

    private void enviarEmails(List<Interprete> lista, String assunto, String texto,
            List<String> enviados, List<String> falhas) {
        Map<SimpleMailMessage, Interprete> mensagens = new IdentityHashMap<>();
        for (Interprete i : lista) {
            SimpleMailMessage m = novaMensagem(i.getEmail(), assunto, saudacao(i) + texto + ASSINATURA);
            mensagens.put(m, i);
        }
        try {
            mailSender.getObject().send(mensagens.keySet().toArray(SimpleMailMessage[]::new));
            lista.stream().map(Interprete::getNome).forEach(enviados::add);
        } catch (MailSendException e) {
            // envio parcial: só as mensagens listadas em getFailedMessages falharam
            Map<Object, Exception> falharam = e.getFailedMessages();
            mensagens.forEach((m, i) -> (falharam.containsKey(m) || falharam.isEmpty() ? falhas : enviados).add(i.getNome()));
            log.warn("Falha ao enviar e-mails para intérpretes: {}", e.getMessage());
        } catch (MailException e) {
            lista.stream().map(Interprete::getNome).forEach(falhas::add);
            log.warn("Falha ao enviar e-mails para intérpretes: {}", e.getMessage());
        }
    }

    /** Cópia para a assessoria: registra o que foi enviado e para quem. */
    private String enviarCopia(String assunto, String texto, List<String> enviados, List<String> falhas,
            List<LinkWhatsapp> links, List<String> avisos) {
        if (!StringUtils.hasText(copia)) {
            return null;
        }
        if (!emailConfigurado()) {
            avisos.add("A cópia para " + copia + " não foi enviada: o envio de e-mail não está configurado no servidor.");
            return null;
        }
        StringBuilder corpo = new StringBuilder()
                .append("Cópia da mensagem enviada aos intérpretes pelo painel em ")
                .append(ZonedDateTime.now(ZoneId.of("America/Sao_Paulo")).format(DATA_HORA)).append(".\n\n")
                .append("Assunto: ").append(assunto).append("\n\n")
                .append(texto).append("\n\n")
                .append("----------------------------------------\n");
        if (!enviados.isEmpty()) corpo.append("E-mail enviado para: ").append(String.join(", ", enviados)).append('\n');
        if (!falhas.isEmpty()) corpo.append("E-mail NÃO enviado para: ").append(String.join(", ", falhas)).append('\n');
        if (!links.isEmpty()) {
            corpo.append("WhatsApp preparado para (envio manual pelo painel): ")
                    .append(String.join(", ", links.stream().map(LinkWhatsapp::nome).toList())).append('\n');
        }
        try {
            mailSender.getObject().send(novaMensagem(copia, "[Cópia] " + assunto, corpo.toString()));
            return copia;
        } catch (MailException e) {
            log.warn("Falha ao enviar a cópia para {}: {}", copia, e.getMessage());
            avisos.add("A cópia para " + copia + " não pôde ser enviada.");
            return null;
        }
    }

    private SimpleMailMessage novaMensagem(String para, String assunto, String corpo) {
        SimpleMailMessage m = new SimpleMailMessage();
        if (StringUtils.hasText(remetente)) {
            m.setFrom(remetente);
        }
        if (StringUtils.hasText(copia)) {
            m.setReplyTo(copia);
        }
        m.setTo(para);
        m.setSubject(assunto);
        m.setText(corpo);
        return m;
    }

    private static String saudacao(Interprete i) {
        return "Olá, " + i.getNome().split(" ")[0] + "!\n\n";
    }

    /** https://wa.me/5521999999999?text=... — número com DDI 55 se vier só com DDD. */
    static String linkWhatsapp(Interprete i, String texto) {
        String numero = i.getCelular().replaceAll("\\D", "");
        if (numero.length() == 10 || numero.length() == 11) {
            numero = "55" + numero;
        }
        String mensagem = saudacao(i) + texto + ASSINATURA;
        return "https://wa.me/" + numero + "?text=" + URLEncoder.encode(mensagem, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
