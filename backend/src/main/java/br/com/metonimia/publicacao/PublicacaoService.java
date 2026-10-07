package br.com.metonimia.publicacao;

import br.com.metonimia.common.HtmlSanitizer;
import br.com.metonimia.publicacao.RedeSocialValidator.Rede;
import br.com.metonimia.upload.ArmazenamentoService;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PublicacaoService {

    private final PublicacaoRepository repositorio;
    private final HtmlSanitizer sanitizer;
    private final MidiaValidator midiaValidator;
    private final RedeSocialValidator redeSocialValidator;
    private final ArmazenamentoService armazenamento;

    public PublicacaoService(PublicacaoRepository repositorio, HtmlSanitizer sanitizer,
            MidiaValidator midiaValidator, RedeSocialValidator redeSocialValidator,
            ArmazenamentoService armazenamento) {
        this.repositorio = repositorio;
        this.sanitizer = sanitizer;
        this.midiaValidator = midiaValidator;
        this.redeSocialValidator = redeSocialValidator;
        this.armazenamento = armazenamento;
    }

    /** Ordenadas por data decrescente. */
    @Transactional(readOnly = true)
    public List<PublicacaoResponse> listar(TipoPublicacao tipo) {
        Instant agora = Instant.now();
        return repositorio.findAllByTipoOrderByDataHoraDesc(tipo).stream()
                .map(p -> PublicacaoResponse.de(p, agora))
                .toList();
    }

    @Transactional(readOnly = true)
    public PublicacaoResponse buscar(Long id) {
        return PublicacaoResponse.de(carregar(id), Instant.now());
    }

    @Transactional
    public PublicacaoResponse criar(PublicacaoRequest req) {
        Publicacao p = new Publicacao();
        p.setTipo(req.tipo());
        aplicar(p, req);
        return PublicacaoResponse.de(repositorio.save(p), Instant.now());
    }

    @Transactional
    public PublicacaoResponse atualizar(Long id, PublicacaoRequest req) {
        Publicacao p = carregar(id);
        Set<String> antes = urlsLocais(p);
        aplicar(p, req); // o tipo não muda na edição
        p.setAtualizadoEm(Instant.now());
        Set<String> removidas = new HashSet<>(antes);
        removidas.removeAll(urlsLocais(p));
        apagarArquivosAposCommit(removidas);
        return PublicacaoResponse.de(p, Instant.now());
    }

    @Transactional
    public void excluir(Long id) {
        Publicacao p = carregar(id);
        Set<String> arquivos = urlsLocais(p);
        repositorio.delete(p);
        apagarArquivosAposCommit(arquivos);
    }

    private Publicacao carregar(Long id) {
        return repositorio.findWithMidiasById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Publicação " + id + " não encontrada."));
    }

    private void aplicar(Publicacao p, PublicacaoRequest req) {
        p.setDataHora(req.dataHora());
        p.setLocal(req.local().strip());
        p.setDescricaoHtml(sanitizer.limpar(req.descricaoHtml()));
        p.setCorFundo(req.corFundo().toLowerCase());
        p.setCorTexto(req.corTexto() == null ? null : req.corTexto().toLowerCase());
        p.setLinkYoutube(redeSocialValidator.validar(req.linkYoutube(), Rede.YOUTUBE));
        p.setLinkInstagram(redeSocialValidator.validar(req.linkInstagram(), Rede.INSTAGRAM));
        p.setLinkX(redeSocialValidator.validar(req.linkX(), Rede.X));
        List<MidiaDto> midias = req.midias() == null ? List.of() : req.midias();
        p.substituirMidias(midias.stream().map(midiaValidator::validar).toList());
    }

    private Set<String> urlsLocais(Publicacao p) {
        return p.getMidias().stream()
                .map(Midia::getUrl)
                .filter(armazenamento::ehLocal)
                .collect(Collectors.toSet());
    }

    /** Só apaga do disco se o banco confirmar a alteração. */
    private void apagarArquivosAposCommit(Set<String> urls) {
        if (urls.isEmpty()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                urls.forEach(armazenamento::excluir);
            }
        });
    }
}
