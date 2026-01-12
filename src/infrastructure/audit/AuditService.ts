import { IAuditService } from './IAuditService';
import { supabase } from '../../lib/supabaseClient';
import { getSession } from '../../lib/auth';
import { logger } from '../../lib/logger';

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
 * Serviço de auditoria
 * Implementa IAuditService para permitir troca de implementação
 */
export class AuditService implements IAuditService {
    /**
     * Registra uma ação no log de auditoria
     */
    async log(
        action: string,
        resourceType: string,
        resourceId: string | null,
        oldData: unknown = null,
        newData: unknown = null
    ): Promise<void> {
        try {
            const session = await getSession();
            if (!session) return; // Não logar se não estiver autenticado
            
            // Verificar se navigator está disponível (não está em SSR/build)
            const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
            
            const { error } = await supabase.from('audit_logs').insert({
                user_id: session.user.id,
                action,
                resource_type: resourceType,
                resource_id: resourceId,
                old_data: sanitizeForLog(oldData),
                new_data: sanitizeForLog(newData),
                ip_address: await getClientIP(),
                user_agent: userAgent
            });
            
            // Se houver erro (ex: 403 Forbidden por falta de permissão), apenas logar mas não falhar
            if (error) {
                logger.warn('Failed to log audit action', { 
                    error: error.message, 
                    code: error.code,
                    action, 
                    resourceType, 
                    resourceId 
                });
            }
        } catch (error) {
            // Não falhar se logging falhar
            logger.warn('AuditService.log exception', { 
                error: error instanceof Error ? error.message : String(error), 
                context: 'AuditService.log' 
            });
        }
    }
}

