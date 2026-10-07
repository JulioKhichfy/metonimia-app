package br.com.metonimia;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** Sobe a aplicação com H2 em memória e testa o fluxo login → criar → listar → excluir. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:teste;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "app.upload.diretorio=target/uploads-teste"
})
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class PublicacaoApiTest {

    @Autowired
    MockMvc mvc;

    @Test
    void adminSemTokenRecebe401() throws Exception {
        mvc.perform(get("/api/admin/publicacoes").param("tipo", "PALESTRA"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void senhaErradaRecebe401() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"errada\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void fluxoCompleto() throws Exception {
        String token = login();
        String futura = Instant.now().plus(10, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS).toString();
        String corpo = """
                {"tipo":"PALESTRA","dataHora":"%s","local":"Centro Cultural","descricaoHtml":"<p>Oi<script>x</script></p>",
                 "corFundo":"#F6EEF8","midias":[{"tipo":"VIDEO_LINK","url":"https://youtu.be/abcdef123","descricao":"Teaser"}]}
                """.formatted(futura);

        String criado = mvc.perform(post("/api/admin/publicacoes").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.descricaoHtml").value("<p>Oi</p>"))
                .andExpect(jsonPath("$.corFundo").value("#f6eef8"))
                .andExpect(jsonPath("$.futura").value(true))
                .andExpect(jsonPath("$.midias", hasSize(1)))
                .andReturn().getResponse().getContentAsString();
        String id = extrair(criado, "\"id\"\\s*:\\s*(\\d+)");

        mvc.perform(get("/api/public/publicacoes").param("tipo", "PALESTRA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].local").value("Centro Cultural"));

        mvc.perform(delete("/api/admin/publicacoes/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    @Test
    void rejeitaMidiaDeOrigemDesconhecida() throws Exception {
        String token = login();
        String corpo = """
                {"tipo":"EVENTO","dataHora":"2026-01-01T12:00:00Z","local":"X","descricaoHtml":"",
                 "corFundo":"#ffffff","midias":[{"tipo":"IMAGEM","url":"https://site-qualquer.com/a.jpg"}]}
                """;
        mvc.perform(post("/api/admin/publicacoes").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isBadRequest());
    }

    @Test
    void salvaCorDaFonteELinksDeRedesSociais() throws Exception {
        String token = login();
        String corpo = """
                {"tipo":"EVENTO","dataHora":"2026-01-01T12:00:00Z","local":"Teatro","descricaoHtml":"",
                 "corFundo":"#111111","corTexto":"#F2C200","linkYoutube":"https://www.youtube.com/@metonimia",
                 "linkInstagram":"instagram.com/metonimia","linkX":"","midias":[]}
                """;
        mvc.perform(post("/api/admin/publicacoes").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.corTexto").value("#f2c200"))
                .andExpect(jsonPath("$.linkYoutube").value("https://www.youtube.com/@metonimia"))
                .andExpect(jsonPath("$.linkInstagram").value("https://instagram.com/metonimia"))
                .andExpect(jsonPath("$.linkX").doesNotExist());
    }

    @Test
    void rejeitaLinkDeRedeSocialDeOutroSite() throws Exception {
        String token = login();
        String corpo = """
                {"tipo":"EVENTO","dataHora":"2026-01-01T12:00:00Z","local":"X","descricaoHtml":"",
                 "corFundo":"#ffffff","linkX":"https://site-falso.com/x.com","midias":[]}
                """;
        mvc.perform(post("/api/admin/publicacoes").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isBadRequest());
    }

    @Test
    void backupExigeLoginEGeraSql() throws Exception {
        mvc.perform(get("/api/admin/backup")).andExpect(status().isUnauthorized());

        String token = login();
        String corpo = """
                {"tipo":"PALESTRA","dataHora":"2026-01-01T12:00:00Z","local":"Sala d'Água","descricaoHtml":"",
                 "corFundo":"#ffffff","midias":[]}
                """;
        mvc.perform(post("/api/admin/publicacoes").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated());

        String sql = mvc.perform(get("/api/admin/backup").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString("attachment")))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        if (!sql.contains("INSERT INTO publicacao") || !sql.contains("'Sala d''Água'") || !sql.contains("COMMIT;")) {
            throw new AssertionError("Backup inesperado:\n" + sql);
        }
    }

    private String login() throws Exception {
        String resposta = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin12345\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return extrair(resposta, "\"token\"\\s*:\\s*\"([^\"]+)\"");
    }

    private static String extrair(String json, String regex) {
        Matcher m = Pattern.compile(regex).matcher(json);
        if (!m.find()) {
            throw new AssertionError("Não encontrado em: " + json);
        }
        return m.group(1);
    }
}
