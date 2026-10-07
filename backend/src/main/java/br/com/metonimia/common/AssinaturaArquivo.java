package br.com.metonimia.common;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.springframework.web.multipart.MultipartFile;

/** Confere a "assinatura" (magic bytes) de um arquivo: o conteúdo precisa bater com a extensão. */
public final class AssinaturaArquivo {

    private AssinaturaArquivo() {}

    public static boolean confere(MultipartFile arquivo, String extensao) {
        byte[] b;
        try (InputStream in = arquivo.getInputStream()) {
            b = in.readNBytes(16);
        } catch (IOException e) {
            return false;
        }
        return switch (extensao) {
            case "jpg" -> comeca(b, 0, 0xFF, 0xD8, 0xFF);
            case "png" -> comeca(b, 0, 0x89, 0x50, 0x4E, 0x47);
            case "gif" -> texto(b, 0, "GIF8");
            case "webp" -> texto(b, 0, "RIFF") && texto(b, 8, "WEBP");
            case "mp4" -> texto(b, 4, "ftyp");
            case "webm" -> comeca(b, 0, 0x1A, 0x45, 0xDF, 0xA3);
            default -> false;
        };
    }

    private static boolean comeca(byte[] b, int desloc, int... esperado) {
        if (b.length < desloc + esperado.length) {
            return false;
        }
        for (int i = 0; i < esperado.length; i++) {
            if ((b[desloc + i] & 0xFF) != esperado[i]) {
                return false;
            }
        }
        return true;
    }

    private static boolean texto(byte[] b, int desloc, String esperado) {
        byte[] e = esperado.getBytes(StandardCharsets.US_ASCII);
        return b.length >= desloc + e.length && Arrays.equals(b, desloc, desloc + e.length, e, 0, e.length);
    }
}
