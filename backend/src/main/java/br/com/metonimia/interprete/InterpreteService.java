package br.com.metonimia.interprete;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InterpreteService {

    private final InterpreteRepository repositorio;
    private final FotoInterpreteStorage fotos;

    public InterpreteService(InterpreteRepository repositorio, FotoInterpreteStorage fotos) {
        this.repositorio = repositorio;
        this.fotos = fotos;
    }

    @Transactional(readOnly = true)
    public List<InterpreteResponse> listar() {
        return repositorio.findAllByOrderByNomeAsc().stream().map(InterpreteResponse::de).toList();
    }

    @Transactional
    public InterpreteResponse criar(InterpreteRequest req, MultipartFile foto) {
        Interprete i = new Interprete();
        aplicar(i, req);
        if (temArquivo(foto)) {
            i.setFoto(salvarFoto(foto));
        }
        return InterpreteResponse.de(repositorio.save(i));
    }

    @Transactional
    public InterpreteResponse atualizar(Long id, InterpreteRequest req, MultipartFile foto) {
        Interprete i = carregar(id);
        aplicar(i, req);
        String anterior = i.getFoto();
        if (temArquivo(foto)) {
            i.setFoto(salvarFoto(foto));
        } else if (req.deveRemoverFoto()) {
            i.setFoto(null);
        }
        if (anterior != null && !anterior.equals(i.getFoto())) {
            apagarAposCommit(anterior);
        }
        i.setAtualizadoEm(Instant.now());
        return InterpreteResponse.de(i);
    }

    @Transactional
    public void excluir(Long id) {
        Interprete i = carregar(id);
        repositorio.delete(i);
        apagarAposCommit(i.getFoto());
    }

    @Transactional(readOnly = true)
    public Optional<FotoInterpreteStorage.Foto> foto(Long id) {
        return fotos.abrir(carregar(id).getFoto());
    }

    Interprete carregar(Long id) {
        return repositorio.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Intérprete " + id + " não encontrado."));
    }

    private static void aplicar(Interprete i, InterpreteRequest req) {
        String celular = req.celular().replaceAll("\\D", "");
        if (celular.length() < 10 || celular.length() > 13) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Celular inválido: informe DDD e número, ex.: (21) 99999-9999.");
        }
        i.setNome(req.nome().strip().replaceAll("\\s+", " "));
        i.setDataNascimento(req.dataNascimento());
        i.setEndereco(req.endereco().strip());
        i.setEmail(req.email() == null || req.email().isBlank() ? null : req.email().strip().toLowerCase());
        i.setCelular(celular);
        i.setCelularWhatsapp(req.ehWhatsapp());
    }

    private static boolean temArquivo(MultipartFile f) {
        return f != null && !f.isEmpty();
    }

    /** Se a transação for desfeita, a foto nova não fica órfã no disco. */
    private String salvarFoto(MultipartFile foto) {
        String nome = fotos.salvar(foto);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    fotos.excluir(nome);
                }
            }
        });
        return nome;
    }

    private void apagarAposCommit(String nome) {
        if (nome == null) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                fotos.excluir(nome);
            }
        });
    }
}
