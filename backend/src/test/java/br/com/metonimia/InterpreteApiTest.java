package br.com.metonimia;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Cadastro de intérpretes (com foto privada) e envio de mensagens. */
class InterpreteApiTest {

    /** PNG mínimo: só a assinatura importa para a validação. */
    static final byte[] PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D};

    static MockMultipartFile dados(String json) {
        return new MockMultipartFile("dados", "", MediaType.APPLICATION_JSON_VALUE, json.getBytes(StandardCharsets.UTF_8));
    }

    static String login(MockMvc mvc) throws Exception {
        String resposta = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin12345\"}"))
                .andReturn().getResponse().getContentAsString();
        return extrair(resposta, "\"token\"\\s*:\\s*\"([^\"]+)\"");
    }

    static String extrair(String json, String regex) {
        Matcher m = Pattern.compile(regex).matcher(json);
        if (!m.find()) {
            throw new AssertionError("Não encontrado em: " + json);
        }
        return m.group(1);
    }

    static String criar(MockMvc mvc, String token, String json) throws Exception {
        String criado = mvc.perform(multipart("/api/admin/interpretes").file(dados(json))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return extrair(criado, "\"id\"\\s*:\\s*(\\d+)");
    }

    @Nested
    @SpringBootTest(properties = {
            "spring.datasource.url=jdbc:h2:mem:interpretes;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            "app.upload.diretorio=target/uploads-teste",
            "app.privado.diretorio=target/privado-teste"
    })
    @AutoConfigureMockMvc
    @ActiveProfiles("dev")
    class SemEmailConfigurado {

        @Autowired
        MockMvc mvc;

        @Test
        void exigeLogin() throws Exception {
            mvc.perform(get("/api/admin/interpretes")).andExpect(status().isUnauthorized());
            mvc.perform(get("/api/admin/interpretes/1/foto")).andExpect(status().isUnauthorized());
        }

        @Test
        void cadastroComFotoPrivada() throws Exception {
            String token = login(mvc);
            String json = """
                    {"nome":"  Ana   Souza ","dataNascimento":"1990-05-20","endereco":"Rua A, 1 — Rio de Janeiro/RJ",
                     "email":"Ana@Exemplo.com","celular":"(21) 99999-0000","celularWhatsapp":true}
                    """;
            String criado = mvc.perform(multipart("/api/admin/interpretes").file(dados(json))
                            .file(new MockMultipartFile("foto", "ana.png", "image/png", PNG))
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.nome").value("Ana Souza"))
                    .andExpect(jsonPath("$.email").value("ana@exemplo.com"))
                    .andExpect(jsonPath("$.celular").value("21999990000"))
                    .andExpect(jsonPath("$.temFoto").value(true))
                    .andReturn().getResponse().getContentAsString();
            String id = extrair(criado, "\"id\"\\s*:\\s*(\\d+)");

            mvc.perform(get("/api/admin/interpretes/" + id + "/foto").header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.IMAGE_PNG))
                    .andExpect(content().bytes(PNG));

            // edição (PUT multipart) removendo a foto
            String edicao = json.replace("\"celularWhatsapp\":true", "\"celularWhatsapp\":false,\"removerFoto\":true");
            mvc.perform(multipart(HttpMethod.PUT, "/api/admin/interpretes/" + id).file(dados(edicao))
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.temFoto").value(false))
                    .andExpect(jsonPath("$.celularWhatsapp").value(false));
            mvc.perform(get("/api/admin/interpretes/" + id + "/foto").header("Authorization", "Bearer " + token))
                    .andExpect(status().isNotFound());

            mvc.perform(delete("/api/admin/interpretes/" + id).header("Authorization", "Bearer " + token))
                    .andExpect(status().isNoContent());
        }

        @Test
        void validaCamposObrigatoriosEFoto() throws Exception {
            String token = login(mvc);
            mvc.perform(multipart("/api/admin/interpretes").file(dados("{\"nome\":\"\",\"celular\":\"123\"}"))
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isBadRequest());

            String json = """
                    {"nome":"Bia","dataNascimento":"1990-01-01","endereco":"Rua B","celular":"21988887777"}
                    """;
            mvc.perform(multipart("/api/admin/interpretes").file(dados(json))
                            .file(new MockMultipartFile("foto", "x.png", "image/png", "não é png".getBytes(StandardCharsets.UTF_8)))
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isUnsupportedMediaType());
        }

        @Test
        void whatsappGeraLinksMesmoSemEmail() throws Exception {
            String token = login(mvc);
            String id = criar(mvc, token, """
                    {"nome":"Carla Lima","dataNascimento":"1985-03-10","endereco":"Rua C","email":"carla@exemplo.com",
                     "celular":"(21) 97777-6666","celularWhatsapp":true}
                    """);
            String corpo = """
                    {"texto":"Reunião amanhã às 10h","canais":["WHATSAPP","EMAIL"],"interpreteIds":[%s]}
                    """.formatted(id);
            mvc.perform(post("/api/admin/interpretes/mensagens").header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON).content(corpo))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.whatsapp", hasSize(1)))
                    .andExpect(jsonPath("$.whatsapp[0].link", startsWith("https://wa.me/5521977776666?text=Ol%C3%A1%2C%20Carla")))
                    .andExpect(jsonPath("$.emailsEnviados", hasSize(0)))
                    .andExpect(jsonPath("$.emailsComFalha[0]").value("Carla Lima"))
                    .andExpect(jsonPath("$.copiaEnviadaPara").doesNotExist())
                    .andExpect(jsonPath("$.avisos[0]", containsString("MAIL_HOST")));
        }
    }

    @Nested
    @SpringBootTest(properties = {
            "spring.datasource.url=jdbc:h2:mem:interpretes-email;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            "app.upload.diretorio=target/uploads-teste",
            "app.privado.diretorio=target/privado-teste",
            "spring.mail.host=smtp.teste"
    })
    @AutoConfigureMockMvc
    @ActiveProfiles("dev")
    class ComEmailConfigurado {

        @Autowired
        MockMvc mvc;

        @MockitoBean
        JavaMailSender mailSender;

        @Test
        void enviaEmailParaTodosECopiaParaAssessoria() throws Exception {
            String token = login(mvc);
            criar(mvc, token, """
                    {"nome":"Davi Rocha","dataNascimento":"1992-07-01","endereco":"Rua D","email":"davi@exemplo.com",
                     "celular":"21966665555","celularWhatsapp":false}
                    """);
            criar(mvc, token, """
                    {"nome":"Eva Melo","dataNascimento":"1993-08-02","endereco":"Rua E",
                     "celular":"21955554444","celularWhatsapp":true}
                    """);
            mvc.perform(post("/api/admin/interpretes/mensagens").header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"assunto\":\"Aviso\",\"texto\":\"Olá a todos\",\"canais\":[\"EMAIL\"],\"todos\":true}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.emailsEnviados[0]").value("Davi Rocha"))
                    .andExpect(jsonPath("$.semEmail[0]").value("Eva Melo"))
                    .andExpect(jsonPath("$.copiaEnviadaPara").value("assessoria@metonimia.com.br"))
                    .andExpect(jsonPath("$.avisos", hasSize(0)));
            verify(mailSender, atLeastOnce()).send(any(SimpleMailMessage[].class));
            verify(mailSender, atLeastOnce()).send(any(SimpleMailMessage.class));
        }
    }
}
