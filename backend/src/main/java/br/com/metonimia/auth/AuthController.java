package br.com.metonimia.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    /** Hash usado quando o usuário não existe, para a resposta levar o mesmo tempo. */
    private final String hashFalso;

    private final AdminUsuarioRepository repositorio;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokens;
    private final LimitadorDeLogin limitador;

    public AuthController(AdminUsuarioRepository repositorio, PasswordEncoder passwordEncoder,
            TokenService tokens, LimitadorDeLogin limitador) {
        this.repositorio = repositorio;
        this.passwordEncoder = passwordEncoder;
        this.tokens = tokens;
        this.limitador = limitador;
        this.hashFalso = passwordEncoder.encode("senha-que-nao-existe");
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
        String ip = http.getRemoteAddr();
        if (limitador.bloqueado(ip)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Muitas tentativas seguidas. Aguarde 15 minutos.");
        }
        var usuario = repositorio.findByUsuario(req.username().trim());
        String hash = usuario.map(AdminUsuario::getSenhaHash).orElse(hashFalso);
        boolean confere = passwordEncoder.matches(req.password(), hash);
        if (usuario.isEmpty() || !confere) {
            limitador.registrarFalha(ip);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário ou senha incorretos.");
        }
        limitador.registrarSucesso(ip);
        return tokens.gerar(usuario.get().getUsuario());
    }
}
