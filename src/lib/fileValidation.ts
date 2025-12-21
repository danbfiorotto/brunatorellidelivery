/**
 * Magic bytes para tipos de imagem
 */
const IMAGE_MAGIC_BYTES: Record<string, number[][]> = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]]
};

/**
 * Valida magic bytes do arquivo
 */
export const validateImageFile = async (file: File): Promise<boolean> => {
    // Validar tipo MIME
    if (!file.type.startsWith('image/')) {
        return false;
    }
    
    // Validar magic bytes
    const magicBytes = IMAGE_MAGIC_BYTES[file.type];
    if (!magicBytes) {
        return false; // Tipo não suportado
    }
    
    // Ler primeiros bytes
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Verificar se magic bytes correspondem
    return magicBytes.some(signature => 
        signature.every((byte, i) => bytes[i] === byte)
    );
};

/**
 * Valida tamanho do arquivo
 */
export const validateFileSize = (file: File, maxSizeMB: number = 10): boolean => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
};

interface ImageDimensionsOptions {
    maxWidth?: number;
    maxHeight?: number;
}

/**
 * Valida dimensões da imagem (opcional)
 */
export const validateImageDimensions = async (file: File, options: ImageDimensionsOptions = {}): Promise<boolean> => {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        
        img.onload = () => {
            URL.revokeObjectURL(url);
            
            if (options.maxWidth && img.width > options.maxWidth) {
                resolve(false);
                return;
            }
            if (options.maxHeight && img.height > options.maxHeight) {
                resolve(false);
                return;
            }
            
            resolve(true);
        };
        
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(false);
        };
        
        img.src = url;
    });
};

/**
 * Validação completa de arquivo de imagem
 */
export const validateImageUpload = async (file: File): Promise<{ isValid: boolean; error?: string }> => {
    // Validar tipo MIME
    if (!file.type.startsWith('image/')) {
        return { isValid: false, error: 'Arquivo não é uma imagem' };
    }
    
    // Validar tamanho
    if (!validateFileSize(file, 10)) {
        return { isValid: false, error: 'Arquivo muito grande (máx: 10MB)' };
    }
    
    // Validar magic bytes
    const isValidMagicBytes = await validateImageFile(file);
    if (!isValidMagicBytes) {
        return { isValid: false, error: 'Arquivo não é uma imagem válida' };
    }
    
    return { isValid: true };
};

/**
 * Sanitiza nome de arquivo
 */
export const sanitizeFileName = (fileName: string): string => {
    if (!fileName) return 'file';
    
    // Remover extensão temporariamente
    const parts = fileName.split('.');
    const ext = parts.length > 1 ? parts.pop() : '';
    const name = parts.join('.');
    
    // Sanitizar nome
    let sanitized = name
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Substituir caracteres perigosos
        .replace(/\.\./g, '_') // Prevenir path traversal
        .substring(0, 200); // Limitar tamanho
    
    // Adicionar extensão de volta
    if (ext) {
        sanitized = `${sanitized}.${ext}`;
    }
    
    // Garantir que não excede 255 caracteres
    return sanitized.substring(0, 255);
};

