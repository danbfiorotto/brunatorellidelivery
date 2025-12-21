// ✅ Verificar se DOMPurify está disponível
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
 * Configuração de sanitização como constante exportável
 */
export const DEFAULT_SANITIZE_CONFIG = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [] as string[],
    KEEP_CONTENT: true
} as const;

/**
 * Sanitiza HTML para prevenir XSS
 * @throws {TypeError} Se input não for string
 */
export const sanitizeHTML = (dirty: unknown, config = DEFAULT_SANITIZE_CONFIG): string => {
    if (typeof dirty !== 'string') {
        throw new TypeError('sanitizeHTML expects a string');
    }
    
    if (!dirty) return '';
    
    if (!DOMPurify) {
        // ✅ Fallback básico se DOMPurify não disponível
        return dirty.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    
    return DOMPurify.sanitize(dirty, config);
};

/**
 * Sanitiza texto simples (remove HTML)
 */
export const sanitizeText = (text: string): string => {
    if (!text) return '';
    
    if (!DOMPurify) {
        // Fallback básico se DOMPurify não disponível
        return text
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]+>/g, '')
            .trim();
    }
    
    return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
};

/**
 * Valida URL de imagem
 */
export const isValidImageUrl = (url: string): boolean => {
    if (!url) return false;
    
    try {
        const urlObj = new URL(url);
        
        // Apenas HTTP/HTTPS
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return false;
        }
        
        // Apenas domínios permitidos
        const allowedDomains = [
            'supabase.co',
            'supabase.in',
            // Adicionar outros domínios permitidos
        ];
        
        const isAllowed = allowedDomains.some(domain => 
            urlObj.hostname.includes(domain)
        );
        
        return isAllowed;
    } catch {
        return false;
    }
};

