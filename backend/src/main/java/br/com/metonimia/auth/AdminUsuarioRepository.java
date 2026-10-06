package br.com.metonimia.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminUsuarioRepository extends JpaRepository<AdminUsuario, Long> {

    Optional<AdminUsuario> findByUsuario(String usuario);
}
