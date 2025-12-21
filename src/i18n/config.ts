import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptBR from './locales/pt-BR.json';
import enUS from './locales/en-US.json';
import esES from './locales/es-ES.json';

/**
 * Configuração do i18next para internacionalização
 * ✅ Suporta pt-BR, en-US e es-ES
 * ✅ Integra com React via react-i18next
 * ✅ Persiste preferência no localStorage
 * ✅ Sincroniza com perfil do usuário
 */
i18n
    .use(initReactI18next)
    .init({
        resources: {
            'pt-BR': {
                translation: ptBR
            },
            'en-US': {
                translation: enUS
            },
            'es-ES': {
                translation: esES
            }
        },
        lng: localStorage.getItem('language') || 'pt-BR', // Idioma padrão
        fallbackLng: 'pt-BR', // Idioma de fallback
        interpolation: {
            escapeValue: false // React já faz escape
        },
        react: {
            useSuspense: false // Não usar Suspense para evitar problemas
        }
    });

export default i18n;




