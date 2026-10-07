-- Cor da fonte (NULL = automática, escolhida pelo contraste com o fundo) e links de redes sociais.
ALTER TABLE publicacao ADD COLUMN cor_texto VARCHAR(7);
ALTER TABLE publicacao ADD COLUMN link_youtube VARCHAR(500);
ALTER TABLE publicacao ADD COLUMN link_instagram VARCHAR(500);
ALTER TABLE publicacao ADD COLUMN link_x VARCHAR(500);
