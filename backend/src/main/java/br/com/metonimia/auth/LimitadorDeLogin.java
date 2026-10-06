package br.com.metonimia.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Freia tentativas de adivinhar a senha: no máximo 5 falhas por IP a cada 15 minutos.
 * Fica em memória — suficiente para um único servidor com um único administrador.
 */
@Component
public class LimitadorDeLogin {

    static final int MAX_FALHAS = 5;
    static final Duration JANELA = Duration.ofMinutes(15);

    private final Map<String, Deque<Instant>> falhas = new ConcurrentHashMap<>();

    public boolean bloqueado(String ip) {
        Deque<Instant> lista = falhas.get(ip);
        if (lista == null) {
            return false;
        }
        synchronized (lista) {
            limpar(lista);
            return lista.size() >= MAX_FALHAS;
        }
    }

    public void registrarFalha(String ip) {
        Deque<Instant> lista = falhas.computeIfAbsent(ip, k -> new ArrayDeque<>());
        synchronized (lista) {
            limpar(lista);
            lista.addLast(Instant.now());
        }
        if (falhas.size() > 10_000) {
            falhas.clear(); // proteção simples contra crescimento ilimitado
        }
    }

    public void registrarSucesso(String ip) {
        falhas.remove(ip);
    }

    private static void limpar(Deque<Instant> lista) {
        Instant limite = Instant.now().minus(JANELA);
        while (!lista.isEmpty() && lista.peekFirst().isBefore(limite)) {
            lista.pollFirst();
        }
    }
}
