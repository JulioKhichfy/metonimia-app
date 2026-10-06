package br.com.metonimia.auth;

import br.com.metonimia.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cria o administrador na primeira inicialização (somente se a tabela estiver vazia),
 * usando ADMIN_USERNAME e ADMIN_PASSWORD. Depois disso, trocar essas variáveis não altera
 * a senha gravada — veja o README para redefinir.
 */
@Component
public class AdminSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final AdminUsuarioRepository repositorio;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties props;

    public AdminSeeder(AdminUsuarioRepository repositorio, PasswordEncoder passwordEncoder, AppProperties props) {
        this.repositorio = repositorio;
        this.passwordEncoder = passwordEncoder;
        this.props = props;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (repositorio.count() > 0) {
            return;
        }
        AppProperties.Admin admin = props.admin();
        if (admin == null || isBlank(admin.usuario()) || isBlank(admin.senha())) {
            log.warn("Nenhum administrador cadastrado. Defina ADMIN_USERNAME e ADMIN_PASSWORD e reinicie.");
            return;
        }
        if (admin.senha().length() < 10) {
            log.warn("ADMIN_PASSWORD tem menos de 10 caracteres. Use uma senha mais forte em produção.");
        }
        repositorio.save(new AdminUsuario(admin.usuario().trim(), passwordEncoder.encode(admin.senha())));
        log.info("Administrador '{}' criado.", admin.usuario().trim());
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
