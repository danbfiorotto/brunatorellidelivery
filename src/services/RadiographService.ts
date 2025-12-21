import { ErrorHandler } from '../infrastructure/errorHandling/ErrorHandler';
import { getCSRFToken } from '../lib/csrf';
import { logAction } from '../lib/audit';
import { logger } from '../lib/logger';
import { sanitizeFileName } from '../lib/fileValidation';
import { PermissionError } from '../domain/errors/AppError';
import { DatabaseAdapter } from '../infrastructure/database/DatabaseAdapter';
import { requireAuth, getSession } from '../lib/auth';
import { apiRateLimiter } from '../lib/rateLimiter';

interface Radiograph {
    id: string;
    patient_id: string;
    appointment_id: string | null;
    file_url: string;
    file_name: string;
    file_size: number | null;
    user_id: string;
    created_at: string;
    updated_at: string;
    appointment?: {
        id: string;
        date: string;
        time: string;
        procedure: string;
    } | null;
}

interface UploadResult {
    url: string;
    fileName: string;
    fileSize: number;
}

/**
 * Serviço para operações de radiografias.
 * 
 * Gerencia upload, download e exclusão de radiografias de pacientes,
 * incluindo integração com Supabase Storage e validação de permissões.
 */
export class RadiographService {
    private db: DatabaseAdapter;

    constructor(db: DatabaseAdapter) {
        this.db = db;
    }
    /**
     * Busca todas as radiografias de um paciente
     */
    async getRadiographs(patientId: string): Promise<Radiograph[]> {
        try {
            await requireAuth();
            const session = await getSession();
            const userId = session?.user?.id || 'anonymous';

            if (!apiRateLimiter.canMakeRequest(userId)) {
                throw new Error('Muitas requisições. Aguarde um momento.');
            }

            const data = await this.db.table('radiographs')
                .select(`
                    *,
                    appointments (
                        id,
                        date,
                        time,
                        procedure
                    )
                `)
                .where('patient_id', patientId)
                .orderBy('created_at', 'desc')
                .execute<Array<Radiograph & { appointments?: unknown }>>();

            // Normalizar dados de appointments
            const normalized = (data || []).map(radio => {
                let appointment = null;
                if (radio.appointments) {
                    if (Array.isArray(radio.appointments) && radio.appointments.length > 0) {
                        appointment = radio.appointments[0];
                    } else if (typeof radio.appointments === 'object' && radio.appointments !== null && !Array.isArray(radio.appointments)) {
                        appointment = radio.appointments;
                    }
                }
                return {
                    ...radio,
                    appointment: appointment
                } as Radiograph;
            });

            return normalized;
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'RadiographService.getRadiographs', patientId });
        }
    }

    /**
     * Faz upload de uma radiografia
     */
    async uploadRadiograph(
        patientId: string, 
        appointmentId: string | null, 
        fileOrUrl: File | string, 
        fileName: string | null = null, 
        fileSize: number | null = null
    ): Promise<Radiograph> {
        try {
            await requireAuth();
            const session = await getSession();
            const userId = session?.user?.id || 'anonymous';

            if (!apiRateLimiter.canMakeRequest(userId)) {
                throw new Error('Muitas requisições. Aguarde um momento.');
            }

            // Validar CSRF
            const token = getCSRFToken();
            if (!token) {
                throw new Error('Token CSRF não encontrado. Por favor, recarregue a página.');
            }

            // Verificar permissão
            if (patientId) {
                const patient = await this.db.table('patients')
                    .select('user_id')
                    .where('id', patientId)
                    .single()
                    .execute<{ user_id?: string }>();

                if (patient && patient.user_id && patient.user_id !== userId) {
                    throw new PermissionError('Você não tem permissão para adicionar radiografias a este paciente.');
                }
            }

            let fileUrl: string;
            let finalFileName = fileName || 'radiografia.jpg';
            let finalFileSize = fileSize;

            // Upload do arquivo se for File
            if (fileOrUrl instanceof File) {
                const uploadResult = await this.uploadFileToStorage(fileOrUrl);
                fileUrl = uploadResult.url;
                finalFileName = uploadResult.fileName;
                finalFileSize = uploadResult.fileSize;
            } else {
                fileUrl = fileOrUrl;
            }

            // Criar registro da radiografia
            const data = await this.db.table('radiographs')
                .insert([{
                    patient_id: patientId,
                    appointment_id: appointmentId || null,
                    file_url: fileUrl,
                    file_name: finalFileName,
                    file_size: finalFileSize,
                    user_id: userId
                }])
                .then(res => (Array.isArray(res) ? res[0] : res) as Radiograph);

            await logAction('create', 'radiograph', data.id, null, { patientId, appointmentId });
            logger.debug('Radiograph uploaded successfully', { radiographId: data.id });

            return data;
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'RadiographService.uploadRadiograph', patientId, appointmentId });
        }
    }

    /**
     * Deleta uma radiografia
     */
    async deleteRadiograph(id: string): Promise<void> {
        try {
            await requireAuth();
            const session = await getSession();
            const userId = session?.user?.id || 'anonymous';

            if (!apiRateLimiter.canMakeRequest(userId)) {
                throw new Error('Muitas requisições. Aguarde um momento.');
            }

            // Validar CSRF
            const token = getCSRFToken();
            if (!token) {
                throw new Error('Token CSRF não encontrado. Por favor, recarregue a página.');
            }

            // Buscar dados antigos para auditoria e verificação de permissão
            const oldData = await this.db.table('radiographs')
                .select('*')
                .where('id', id)
                .single()
                .execute<Radiograph>();

            if (oldData && oldData.user_id && oldData.user_id !== userId) {
                throw new PermissionError('Você não tem permissão para excluir esta radiografia.');
            }

            // Deletar arquivo do storage se existir
            if (oldData?.file_url && (oldData.file_url.includes('/storage/v1/object/public/') || oldData.file_url.includes('/storage/v1/object/sign/'))) {
                try {
                    const urlParts = oldData.file_url.split('/radiographs/');
                    if (urlParts.length > 1) {
                        const filePath = `radiographs/${urlParts[1].split('?')[0]}`;
                        // Usar storage do adapter (funcionalidade específica do Supabase)
                        const client = this.db.getClient() as import('../infrastructure/database/adapters/SupabaseClientAdapter').SupabaseClientAdapter;
                        await client.getStorage().from('radiographs').remove([filePath]);
                    }
                } catch (storageError) {
                    logger.error(storageError, { context: 'RadiographService.deleteRadiograph.storage', id });
                    // Continuar mesmo se falhar ao deletar do storage
                }
            }

            // Deletar registro
            await this.db.table('radiographs')
                .where('id', id)
                .delete();

            await logAction('delete', 'radiograph', id, oldData, null);
            logger.debug('Radiograph deleted successfully', { radiographId: id });
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'RadiographService.deleteRadiograph', id });
        }
    }

    /**
     * Faz upload de arquivo para o storage
     * ⚠️ Usa cliente Supabase diretamente para storage (funcionalidade específica)
     */
    async uploadFileToStorage(file: File, folder: string = 'radiographs'): Promise<UploadResult> {
        try {
            await requireAuth();

            const sanitizedOriginalName = sanitizeFileName(file.name);
            const fileExt = sanitizedOriginalName.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${folder}/${fileName}`;

            // Usar storage do adapter (funcionalidade específica do Supabase)
            const client = this.db.getClient() as import('../infrastructure/database/adapters/SupabaseClientAdapter').SupabaseClientAdapter;
            const { data, error } = await client.getStorage()
                .from(folder)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: { publicUrl } } = client.storage
                .from(folder)
                .getPublicUrl(filePath);

            return {
                url: publicUrl,
                fileName: sanitizedOriginalName,
                fileSize: file.size
            };
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'RadiographService.uploadFileToStorage', folder });
        }
    }
}

