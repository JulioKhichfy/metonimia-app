package br.com.metonimia;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class MetonimiaApplication {

    public static void main(String[] args) {
        SpringApplication.run(MetonimiaApplication.class, args);
    }
}
