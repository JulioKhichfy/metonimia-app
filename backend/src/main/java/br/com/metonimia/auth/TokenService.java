package br.com.metonimia.auth;

import br.com.metonimia.config.AppProperties;
import java.time.Duration;
import java.time.Instant;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class TokenService {

    private final JwtEncoder encoder;
    private final Duration validade;

    public TokenService(JwtEncoder encoder, AppProperties props) {
        this.encoder = encoder;
        Duration configurada = props.jwt() == null ? null : props.jwt().validade();
        this.validade = configurada == null ? Duration.ofHours(8) : configurada;
    }

    public LoginResponse gerar(String usuario) {
        Instant agora = Instant.now();
        Instant expira = agora.plus(validade);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("metonimia-api")
                .subject(usuario)
                .issuedAt(agora)
                .expiresAt(expira)
                .claim("scope", "ADMIN")
                .build();
        JwsHeader cabecalho = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = encoder.encode(JwtEncoderParameters.from(cabecalho, claims)).getTokenValue();
        return new LoginResponse(token, expira);
    }
}
