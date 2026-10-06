package br.com.metonimia.common;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Component;

/**
 * Limpa o HTML gerado pelo editor (Quill) antes de gravar: remove scripts, eventos (onclick…),
 * iframes e qualquer tag fora da lista. Mantém class e style para preservar fonte, tamanho e cor.
 */
@Component
public class HtmlSanitizer {

    private static final Safelist PERMITIDOS = Safelist.relaxed()
            .addTags("s", "span")
            .addAttributes(":all", "class", "style")
            .addAttributes("li", "data-list")
            .addAttributes("a", "target", "rel")
            .addProtocols("a", "href", "tel")
            .removeTags("img"); // fotos entram pelo campo próprio, não dentro do texto

    private static final Document.OutputSettings SAIDA = new Document.OutputSettings().prettyPrint(false);

    public String limpar(String html) {
        if (html == null || html.isBlank()) {
            return "";
        }
        String limpo = Jsoup.clean(html, "", PERMITIDOS, SAIDA);
        // O Quill devolve "<p><br></p>" quando o editor está vazio
        return limpo.replaceAll("(?i)^(<p><br></p>)+$", "");
    }
}
