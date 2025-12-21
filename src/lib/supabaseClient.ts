import { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseClientFactory } from '../infrastructure/database/DatabaseClientFactory'

/**
 * @deprecated Use DatabaseClientFactory.getInstance() ao invés deste export
 * Este arquivo será removido na próxima versão para evitar múltiplas instâncias do SupabaseClient
 * 
 * Para novos códigos, use:
 * - DatabaseClientFactory.getInstance() para obter o SupabaseClient singleton
 * - DatabaseAdapter via DI para operações de banco de dados
 * 
 * NOTA DE SEGURANÇA:
 * 
 * A VITE_SUPABASE_ANON_KEY é exposta no cliente por design do Supabase.
 * A segurança depende de:
 * 1. Row Level Security (RLS) configurado corretamente
 * 2. Políticas de acesso adequadas
 * 
 * NUNCA use a service role key no cliente.
 * Para operações sensíveis, use Edge Functions.
 */

/**
 * Retorna a instância singleton do SupabaseClient
 * ✅ Usa DatabaseClientFactory para garantir uma única instância
 */
export const supabase: SupabaseClient = DatabaseClientFactory.getInstance()

