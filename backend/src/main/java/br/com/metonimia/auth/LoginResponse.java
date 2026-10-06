package br.com.metonimia.auth;

import java.time.Instant;

public record LoginResponse(String token, Instant expiraEm) {}
