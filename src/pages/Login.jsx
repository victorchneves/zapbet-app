import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Login() {
    const { t } = useTranslation()
    const { signIn, user } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    // Redirect if already logged in
    useEffect(() => {
        if (user) navigate('/');
    }, [user, navigate]);

    const handleLogin = async () => {
        setLoading(true)
        const { error } = await signIn(email, password)
        if (error) {
            alert(error.message)
        } else {
            // Success is handled by useEffect
        }
        setLoading(false)
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-foreground">
            <div className="w-full max-w-sm space-y-6">
                <div className="flex flex-col items-center space-y-4">
                    {/* Logo */}
                    <img
                        src="/zapbet-logo.png"
                        alt="ZapBet Logo"
                        className="h-20 w-20 object-cover rounded-full"
                    />
                    <h1 className="text-3xl font-bold tracking-tighter text-white">ZapBet</h1>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            type="email"
                            placeholder={t('email')}
                            className="bg-card border-border text-white"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <Input
                            type="password"
                            placeholder={t('password')}
                            className="bg-card border-border text-white"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <Button
                        className="w-full font-bold uppercase tracking-wide"
                        size="lg"
                        onClick={handleLogin}
                        disabled={loading}
                    >
                        {loading ? t('entering') : t('login')}
                    </Button>

                    <div className="text-center text-xs text-muted-foreground">
                        {t('no_account')} <span className="text-primary cursor-pointer hover:underline" onClick={() => navigate('/signup')}>{t('create_now')}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
