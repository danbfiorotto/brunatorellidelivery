import { supabase } from './supabaseClient';
import { getSession } from './auth';
import { logger } from './logger';

/**
 * Sanitiza dados antes de logar (remove campos sensíveis)
 */
const sanitizeForLog = (data: unknown): unknown => {
    if (!data || typeof data !== 'object') return null;
    
    const sanitized = { ...data as Record<string, unknown> };
    const sensitiveFields = ['password', 'token', 'email', 'cpf', 'phone', 'address', 'clinical_evolution', 'notes', 'value', 'payment_date'];
    
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });
    
    return sanitized;
};

/**
 * Obtém IP do cliente (simplificado - em produção usar header real)
 */
const getClientIP = async (): Promise<string | null> => {
    // Em produção, obter do header da requisição
    return null; // Por enquanto retorna null
};

/**
 * Registra ação no log de auditoria
 */
export const logAction = async (
    action: string,
    resourceType: string,
    resourceId: string | null,
    oldData: unknown = null,
    newData: unknown = null
): Promise<void> => {
    try {
        const session = await getSession();
        if (!session) return; // Não logar se não estiver autenticado
        
        // Verificar se navigator está disponível (não está em SSR/build)
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
        
        await supabase.from('audit_logs').insert({
            user_id: session.user.id,
            action,
            resource_type: resourceType,
            resource_id: resourceId,
            old_data: sanitizeForLog(oldData),
            new_data: sanitizeForLog(newData),
            ip_address: await getClientIP(),
            user_agent: userAgent
        });
    } catch (error) {
        // Não falhar se logging falhar
        logger.error(error, { context: 'logAction' });
    }
};

