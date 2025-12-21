# Rate Limit Edge Function

Esta Edge Function implementa rate limiting para proteger a API contra abuso.

## ✅ Status

- ✅ **Deploy:** Concluído e ativo
- ✅ **Tabela:** `rate_limit_cache` criada
- ✅ **Cron Job:** Configurado para limpeza automática (a cada hora)
- ✅ **RLS:** Habilitado e protegido

## Configuração

### Variáveis de Ambiente (já configuradas automaticamente)

A Edge Function usa automaticamente as variáveis de ambiente do Supabase:
- `SUPABASE_URL`: URL do projeto
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key

## Limites Configurados

- **API geral:** 30 requisições/minuto
- **Login:** 5 requisições/minuto
- **Padrão:** 30 requisições/minuto

## Uso

### Chamada Básica

```javascript
const response = await fetch('https://upvdyopgkyziptqzqols.supabase.co/functions/v1/rate-limit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'SUA_ANON_KEY',
    // Opcional: para usuários autenticados
    'Authorization': 'Bearer JWT_TOKEN'
  },
  body: JSON.stringify({ 
    endpoint_type: 'api' // ou 'login' ou omitir para 'default'
  })
});

const data = await response.json();
// { allowed: true, remaining: 29, reset_at: 1234567890 }
```

### Resposta de Sucesso (200)

```json
{
  "allowed": true,
  "remaining": 29,
  "reset_at": 1234567890
}
```

### Resposta de Limite Excedido (429)

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Limit: 30 per 60 seconds.",
  "retry_after": 45
}
```

### Headers de Resposta

- `X-RateLimit-Limit`: Limite de requisições
- `X-RateLimit-Remaining`: Requisições restantes
- `X-RateLimit-Reset`: Timestamp de reset
- `Retry-After`: Segundos até poder tentar novamente (quando bloqueado)

## Testes

Veja o guia completo em: [`GUIA_TESTE_RATE_LIMIT.md`](../../GUIA_TESTE_RATE_LIMIT.md)

### Teste Rápido com cURL

```bash
curl -X POST https://upvdyopgkyziptqzqols.supabase.co/functions/v1/rate-limit \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_ANON_KEY" \
  -d '{"endpoint_type": "api"}'
```

### Teste com Script Node.js

Execute o script de teste:
```bash
# 1. Configure SUPABASE_ANON_KEY no arquivo test-rate-limit-function.js
# 2. Execute:
node test-rate-limit-function.js
```

## Manutenção

### Cron Job de Limpeza

O cron job executa automaticamente a cada hora para limpar entradas antigas:

```sql
-- Verificar status do cron job
SELECT * FROM cron.job WHERE jobname = 'cleanup-rate-limit-cache';

-- Executar limpeza manualmente (se necessário)
SELECT cleanup_rate_limit_cache();
```

### Monitoramento

```sql
-- Ver entradas na tabela
SELECT * FROM rate_limit_cache ORDER BY updated_at DESC LIMIT 10;

-- Ver contagem por tipo
SELECT 
  SUBSTRING(key FROM 'rate_limit:.*:(.*)') as endpoint_type,
  COUNT(*) as count
FROM rate_limit_cache
GROUP BY endpoint_type;
```

## Troubleshooting

Veja a seção de troubleshooting em: [`GUIA_TESTE_RATE_LIMIT.md`](../../GUIA_TESTE_RATE_LIMIT.md#4-troubleshooting)

