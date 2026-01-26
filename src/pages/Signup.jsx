import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Signup() {
    const { t } = useTranslation()
    const { signUp } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSignup = async () => {
        console.log('[SIGNUP] Starting signup process...', { email, hasPassword: !!password })
        setLoading(true)

        try {
            const { data, error } = await signUp(email, password)
            console.log('[SIGNUP] Supabase response:', { data, error })

            if (error) {
                console.error('[SIGNUP] Error:', error)
                alert(`Erro: ${error.message}`)
            } else {
                console.log('[SIGNUP] Success! Redirecting to onboarding...')
                alert(t('account_created'))
                navigate('/onboarding')
            }
        } catch (err) {
            console.error('[SIGNUP] Unexpected error:', err)
            alert(`Erro inesperado: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-foreground">
            <div className="w-full max-w-sm space-y-6">
                {/* Header with clear "CREATE ACCOUNT" message */}
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
                        <h1 className="text-2xl font-bold text-primary">+</h1>
                    </div>
                    <div className="text-center space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight text-white">
                            {t('create_account')}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            {t('join_elite')}
                        </p>
                    </div>
                </div>

                {/* Instruction Box */}
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-primary font-medium">
                        📝 Preencha os campos abaixo para criar sua conta
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                        <Input
                            type="email"
                            placeholder="seu@email.com"
                            className="bg-card border-border text-white"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Senha</label>
                        <Input
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            className="bg-card border-border text-white"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <Button
                        className="w-full font-bold uppercase tracking-wide bg-primary hover:bg-primary/90 text-base py-6"
                        size="lg"
                        onClick={handleSignup}
                        disabled={loading || !email || !password}
                    >
                        {loading ? '⏳ Criando conta...' : '✨ Cadastrar'}
                    </Button>

                    <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
                        {t('already_have_account')} <span className="text-primary cursor-pointer hover:underline font-bold" onClick={() => navigate('/login')}>{t('login')}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
