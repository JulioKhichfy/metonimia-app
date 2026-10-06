package br.com.metonimia.publicacao;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Uma palestra ou um evento. Não guardamos se é "futura" ou "passada": isso é calculado
 * comparando dataHora com o instante atual, então muda sozinho quando a hora passa.
 */
@Entity
@Table(name = "publicacao")
public class Publicacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoPublicacao tipo;

    @Column(name = "data_hora", nullable = false)
    private Instant dataHora;

    @Column(name = "local_endereco", nullable = false, length = 300)
    private String local;

    @Column(name = "descricao_html", nullable = false, columnDefinition = "TEXT")
    private String descricaoHtml = "";

    @Column(name = "cor_fundo", nullable = false, length = 7)
    private String corFundo = "#f6eef8";

    @OneToMany(mappedBy = "publicacao", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordem ASC")
    private List<Midia> midias = new ArrayList<>();

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    @PrePersist
    void antesDeInserir() {
        Instant agora = Instant.now();
        criadoEm = agora;
        atualizadoEm = agora;
    }

    /** Substitui a lista de mídias mantendo a ordem informada. */
    public void substituirMidias(List<Midia> novas) {
        midias.clear();
        for (int i = 0; i < novas.size(); i++) {
            Midia m = novas.get(i);
            m.setPublicacao(this);
            m.setOrdem(i);
            midias.add(m);
        }
    }

    public boolean futura(Instant agora) {
        return dataHora.isAfter(agora);
    }

    public Long getId() {
        return id;
    }

    public TipoPublicacao getTipo() {
        return tipo;
    }

    public void setTipo(TipoPublicacao tipo) {
        this.tipo = tipo;
    }

    public Instant getDataHora() {
        return dataHora;
    }

    public void setDataHora(Instant dataHora) {
        this.dataHora = dataHora;
    }

    public String getLocal() {
        return local;
    }

    public void setLocal(String local) {
        this.local = local;
    }

    public String getDescricaoHtml() {
        return descricaoHtml;
    }

    public void setDescricaoHtml(String descricaoHtml) {
        this.descricaoHtml = descricaoHtml;
    }

    public String getCorFundo() {
        return corFundo;
    }

    public void setCorFundo(String corFundo) {
        this.corFundo = corFundo;
    }

    public List<Midia> getMidias() {
        return midias;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }

    public void setAtualizadoEm(Instant atualizadoEm) {
        this.atualizadoEm = atualizadoEm;
    }
}
