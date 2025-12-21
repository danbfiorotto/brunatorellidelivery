import { ZodSchema } from 'zod';

/**
 * Configuração de sanitização
 */
export interface SanitizeConfig {
    ALLOWED_TAGS?: string[];
    ALLOWED_ATTR?: string[];
    KEEP_CONTENT?: boolean;
}

/**
 * Interface para serviço de sanitização
 * Permite trocar implementação sem alterar código dependente
 */
export interface ISanitizer {
    /**
     * Sanitiza texto simples (remove HTML)
     */
    sanitizeText(text: unknown): string;

    /**
     * Sanitiza HTML para prevenir XSS
     */
    sanitizeHTML(html: unknown, config?: SanitizeConfig): string;

    /**
     * Valida e sanitiza dados usando schema Zod
     */
    validateAndSanitize<T>(data: T, schema: ZodSchema<T>): T;

    /**
     * Sanitiza objeto recursivamente
     */
    deepSanitize<T>(obj: T): T;
}
