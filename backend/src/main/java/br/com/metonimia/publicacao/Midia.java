package br.com.metonimia.publicacao;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "midia")
public class Midia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "publicacao_id", nullable = false)
    private Publicacao publicacao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoMidia tipo;

    @Column(nullable = false, length = 1000)
    private String url;

    /** Texto alternativo da foto ou legenda do vídeo. */
    @Column(length = 500)
    private String descricao;

    @Column(nullable = false)
    private int ordem;

    protected Midia() {
        // exigido pelo JPA
    }

    public Midia(TipoMidia tipo, String url, String descricao) {
        this.tipo = tipo;
        this.url = url;
        this.descricao = descricao;
    }

    public TipoMidia getTipo() {
        return tipo;
    }

    public String getUrl() {
        return url;
    }

    public String getDescricao() {
        return descricao;
    }

    void setPublicacao(Publicacao publicacao) {
        this.publicacao = publicacao;
    }

    void setOrdem(int ordem) {
        this.ordem = ordem;
    }
}
