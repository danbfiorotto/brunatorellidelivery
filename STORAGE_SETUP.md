# Configuração do Supabase Storage para Radiografias

Este guia explica como configurar o bucket do Supabase Storage para armazenar as radiografias dos pacientes.

## Passo 1: Criar o Bucket no Supabase

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá para **Storage** no menu lateral
4. Clique em **New Bucket**
5. Configure o bucket:
   - **Name**: `radiographs`
   - **Public bucket**: ✅ Sim (para permitir acesso público às imagens)
   - **File size limit**: `10 MB` (ou o tamanho máximo desejado)
   - **Allowed MIME types**: `image/*` (ou tipos específicos como `image/jpeg,image/png,image/jpg`)

6. Clique em **Create bucket**

## Passo 2: Configurar Políticas de Acesso (RLS)

Após criar o bucket, você precisa configurar as políticas de acesso. Execute o seguinte SQL no **SQL Editor** do Supabase:

```sql
-- Allow public read access
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT
USING (bucket_id = 'radiographs');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated upload" ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'radiographs' 
    AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their own files
CREATE POLICY "Authenticated update" ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'radiographs' 
    AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Authenticated delete" ON storage.objects
FOR DELETE
USING (
    bucket_id = 'radiographs' 
    AND auth.role() = 'authenticated'
);
```

**Nota**: Se você configurou o bucket como público, a política de leitura pode não ser necessária, mas é recomendada para controle.

## Passo 3: Verificar Configuração

Para verificar se tudo está funcionando:

1. Tente fazer upload de uma radiografia através da aplicação
2. Verifique no Storage se o arquivo foi criado na pasta `radiographs/`
3. Verifique se a URL pública está sendo gerada corretamente

## Estrutura de Pastas

Os arquivos serão organizados assim:
```
radiographs/
  ├── 1234567890-abc123.jpg
  ├── 1234567891-def456.png
  └── ...
```

Cada arquivo terá um nome único baseado em timestamp e string aleatória para evitar conflitos.

## Troubleshooting

### Erro: "Bucket not found"
- Verifique se o bucket foi criado com o nome exato `radiographs`
- Verifique se você está usando o projeto correto do Supabase

### Erro: "new row violates row-level security policy"
- Execute as políticas SQL acima
- Verifique se o usuário está autenticado (se estiver usando autenticação)

### Erro: "File too large"
- Aumente o limite de tamanho do arquivo nas configurações do bucket
- Ou reduza o tamanho das imagens antes do upload

### Imagens não aparecem
- Verifique se o bucket está configurado como público
- Verifique se a política de leitura pública está ativa
- Verifique se a URL gerada está correta no banco de dados

## Segurança

Para produção, considere:
- Usar autenticação obrigatória
- Implementar políticas mais restritivas
- Adicionar validação de tipos de arquivo no backend
- Implementar compressão de imagens antes do upload
- Usar CDN para melhor performance


