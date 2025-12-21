/**
 * Gera token CSRF
 */
export const generateCSRFToken = (): string => {
    if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
        // Fallback para ambiente sem crypto (SSR/build)
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Obtém token CSRF (gera se não existir)
 */
export const getCSRFToken = (): string => {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
        // Em ambiente SSR/build, retornar token temporário
        return generateCSRFToken();
    }
    let token = sessionStorage.getItem('csrf_token');
    if (!token) {
        token = generateCSRFToken();
        sessionStorage.setItem('csrf_token', token);
    }
    return token;
};

/**
 * Valida token CSRF
 */
export const validateCSRFToken = (token: string): boolean => {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
        // Em ambiente SSR/build, sempre retornar true
        return true;
    }
    const storedToken = sessionStorage.getItem('csrf_token');
    return token === storedToken;
};

