/**
 * @deprecated Use Logger via DI ao invés deste singleton
 * Mantido apenas para compatibilidade durante migração
 */
import { Logger } from '../infrastructure/logging/Logger';

// Singleton para compatibilidade (será removido)
export const logger = new Logger();

