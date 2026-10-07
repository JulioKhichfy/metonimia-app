package br.com.metonimia.backup;

import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Gera um arquivo .sql só com os dados (INSERTs) de palestras, eventos, mídias, serviços e intérpretes.
 * Contém dados pessoais dos intérpretes (LGPD): guarde o arquivo em local seguro.
 * O esquema não entra: ele é recriado pelo Flyway ao subir a API. O usuário admin também
 * não entra, porque é recriado a partir das variáveis de ambiente.
 * Funciona igual no PostgreSQL (produção) e no H2 (desenvolvimento), sem depender do pg_dump.
 */
@Service
public class BackupService {

    /** Na ordem em que precisam ser inseridas (midia referencia publicacao). */
    private static final List<String> TABELAS = List.of("publicacao", "midia", "servico", "interprete");

    private final JdbcTemplate jdbc;

    public BackupService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public String gerar() {
        StringBuilder sql = new StringBuilder();
        sql.append("""
                -- Backup do banco da Metonímia (palestras, eventos, mídias, serviços e intérpretes)
                -- CONTÉM DADOS PESSOAIS (LGPD): guarde em local seguro e não compartilhe.
                -- Gerado em %s
                --
                -- Para restaurar, com a API já tendo subido ao menos uma vez (o Flyway cria as tabelas):
                --   docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" metonimia' < este-arquivo.sql
                -- ATENÇÃO: a restauração APAGA palestras, eventos, serviços e intérpretes atuais antes de inserir os do backup.
                -- Fotos e vídeos ficam em disco (volumes "uploads" e "privado") e não estão neste arquivo.

                BEGIN;
                """.formatted(Instant.now()));
        for (String tabela : TABELAS.reversed()) {
            sql.append("DELETE FROM ").append(tabela).append(";\n");
        }
        for (String tabela : TABELAS) {
            sql.append('\n');
            jdbc.query("SELECT * FROM " + tabela + " ORDER BY id", (ResultSetExtractor<Void>) rs -> {
                inserts(tabela, rs, sql);
                return null;
            });
            Long proximo = jdbc.queryForObject("SELECT COALESCE(MAX(id), 0) + 1 FROM " + tabela, Long.class);
            sql.append("ALTER TABLE ").append(tabela).append(" ALTER COLUMN id RESTART WITH ").append(proximo).append(";\n");
        }
        sql.append("\nCOMMIT;\n");
        return sql.toString();
    }

    private static void inserts(String tabela, ResultSet rs, StringBuilder sql) throws SQLException {
        ResultSetMetaData meta = rs.getMetaData();
        StringBuilder colunas = new StringBuilder();
        for (int i = 1; i <= meta.getColumnCount(); i++) {
            colunas.append(i > 1 ? ", " : "").append(meta.getColumnLabel(i).toLowerCase());
        }
        while (rs.next()) {
            sql.append("INSERT INTO ").append(tabela).append(" (").append(colunas).append(") VALUES (");
            for (int i = 1; i <= meta.getColumnCount(); i++) {
                sql.append(i > 1 ? ", " : "").append(literal(rs.getObject(i)));
            }
            sql.append(");\n");
        }
    }

    static String literal(Object valor) {
        return switch (valor) {
            case null -> "NULL";
            case Number n -> n.toString();
            case Boolean b -> b ? "TRUE" : "FALSE";
            case Timestamp t -> texto(t.toInstant().toString());
            case OffsetDateTime o -> texto(o.toInstant().toString());
            default -> texto(valor.toString());
        };
    }

    private static String texto(String s) {
        return "'" + s.replace("'", "''") + "'";
    }
}
