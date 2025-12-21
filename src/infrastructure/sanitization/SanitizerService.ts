import { ISanitizer, SanitizeConfig } from './ISanitizer';
import { ZodSchema } from 'zod';

// Verificar se DOMPurify está disponível
let DOMPurify: typeof import('dompurify').default | null = null;
let dompurifyLoading: Promise<void> | null = null;

// Tentar carregar DOMPurify dinamicamente (apenas no browser)
if (typeof window !== 'undefined') {
    dompurifyLoading = import('dompurify')
        .then((module) => {
            DOMPurify = module.default;
        })
        .catch(() => {
            // Fallback se não estiver instalado
            if (import.meta.env.DEV) {
                console.warn('DOMPurify not available, using basic sanitization');
            }
        });
}

/**
 * Configuração padrão de sanitização
 */
const DEFAULT_SANITIZE_CONFIG: SanitizeConfig = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
};

/**
 * Serviço de sanitização
 * Implementa ISanitizer para permitir troca de implementação
 */
export class SanitizerService implements ISanitizer {
    /**
     * Sanitiza texto simples (remove HTML)
     */
    sanitizeText(text: unknown): string {
        if (typeof text !== 'string') {
            throw new TypeError('sanitizeText expects a string');
        }
        
        if (!text) return '';
        
        if (!DOMPurify) {
            // Fallback básico se DOMPurify não disponível
            return text
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<[^>]+>/g, '')
                .trim();
        }
        
        return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
    }

    /**
     * Sanitiza HTML para prevenir XSS
     */
    sanitizeHTML(html: unknown, config: SanitizeConfig = DEFAULT_SANITIZE_CONFIG): string {
        if (typeof html !== 'string') {
            throw new TypeError('sanitizeHTML expects a string');
        }
        
        if (!html) return '';
        
        if (!DOMPurify) {
            // Fallback básico se DOMPurify não disponível
            return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }
        
        return DOMPurify.sanitize(html, config);
    }

    /**
     * Valida e sanitiza dados usando schema Zod
     */
    validateAndSanitize<T>(data: T, schema: ZodSchema<T>): T {
        // Validar primeiro
        const validated = schema.parse(data);
        
        // Sanitizar strings recursivamente
        return this.deepSanitize(validated) as T;
    }

    /**
     * Sanitiza objeto recursivamente
     */
    deepSanitize<T>(obj: T): T {
        if (typeof obj === 'string') {
            return this.sanitizeText(obj) as T;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepSanitize(item)) as T;
        }
        
        if (obj && typeof obj === 'object') {
            return Object.entries(obj).reduce((acc, [key, value]) => {
                acc[key as keyof T] = this.deepSanitize(value);
                return acc;
            }, {} as T);
        }
        
        return obj;
    }
}
