package br.com.metonimia;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.com.metonimia.common.HtmlSanitizer;
import org.junit.jupiter.api.Test;

class HtmlSanitizerTest {

    private final HtmlSanitizer sanitizer = new HtmlSanitizer();

    @Test
    void mantemFormatacaoDoEditor() {
        String html = "<p class=\"ql-align-center\"><span class=\"ql-size-large\" style=\"color: rgb(160, 19, 173);\">"
                + "<strong>Olá</strong> <em>mundo</em></span></p>";
        assertEquals(html, sanitizer.limpar(html));
    }

    @Test
    void removeScriptsEEventos() {
        String limpo = sanitizer.limpar("<p onclick=\"alert(1)\">oi</p><script>alert(2)</script><img src=x onerror=alert(3)>");
        assertFalse(limpo.contains("script"));
        assertFalse(limpo.contains("onclick"));
        assertFalse(limpo.contains("onerror"));
        assertTrue(limpo.contains("oi"));
    }

    @Test
    void editorVazioViraTextoVazio() {
        assertEquals("", sanitizer.limpar("<p><br></p>"));
        assertEquals("", sanitizer.limpar(null));
    }
}
