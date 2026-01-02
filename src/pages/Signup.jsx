import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Signup() {
    const { signUp } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSignup = async () => {
        setLoading(true)
        const { error } = await signUp(email, password)
        if (error) {
            alert(error.message)
        } else {
            alert('Conta criada! Verifique seu email ou faça login (se email confirm desativado).')
            navigate('/onboarding')
        }
        setLoading(false)
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-foreground">
            <div className="w-full max-w-sm space-y-6">
                <div className="flex flex-col items-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tighter text-white">ZapBet</h1>
                    <p className="text-muted-foreground text-center text-sm">
                        Join the elite.
                    </p>
                </div>

                <div className="space-y-4">
                    <Input
                        type="email"
                        placeholder="Email"
                        className="bg-card border-border text-white"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                        type="password"
                        placeholder="Password"
                        className="bg-card border-border text-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                        className="w-full font-bold uppercase tracking-wide"
                        size="lg"
                        onClick={handleSignup}
                        disabled={loading}
                    >
                        {loading ? 'Creating...' : 'Sign Up'}
                    </Button>

                    <div className="text-center text-xs text-muted-foreground">
                        Já tem conta? <span className="text-primary cursor-pointer hover:underline" onClick={() => navigate('/login')}>Login</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
