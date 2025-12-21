/**
 * Interface para serviço de auditoria
 * Permite trocar implementação sem alterar código dependente
 */
export interface IAuditService {
    /**
     * Registra uma ação no log de auditoria
     * @param action - Ação realizada (create, update, delete, etc.)
     * @param resourceType - Tipo de recurso (patient, appointment, etc.)
     * @param resourceId - ID do recurso afetado
     * @param oldData - Dados antigos (para update/delete)
     * @param newData - Dados novos (para create/update)
     */
    log(
        action: string,
        resourceType: string,
        resourceId: string | null,
        oldData?: unknown | null,
        newData?: unknown | null
    ): Promise<void>;
}

