import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'pt' ? 'es' : 'pt';
        i18n.changeLanguage(newLang);
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="text-muted-foreground hover:text-white"
        >
            {i18n.language === 'pt' ? '🇧🇷 PT' : '🇪🇸 ES'}
        </Button>
    );
}
