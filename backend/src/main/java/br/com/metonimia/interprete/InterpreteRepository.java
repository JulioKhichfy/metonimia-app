package br.com.metonimia.interprete;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterpreteRepository extends JpaRepository<Interprete, Long> {

    List<Interprete> findAllByOrderByNomeAsc();
}
