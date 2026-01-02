import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
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
                <div className="flex flex-col items-center space-y-2">
                    {/* Logo */}
                    <h1 className="text-3xl font-bold tracking-tighter text-white">ZapBet</h1>
                    <p className="text-muted-foreground text-center text-sm">
                        Enter the black zone.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
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
                    </div>
                    <Button
                        className="w-full font-bold uppercase tracking-wide"
                        size="lg"
                        onClick={handleLogin}
                        disabled={loading}
                    >
                        {loading ? 'Entering...' : 'Login'}
                    </Button>

                    <div className="text-center text-xs text-muted-foreground">
                        Não tem conta? <span className="text-primary cursor-pointer hover:underline" onClick={() => navigate('/signup')}>Criar Agora</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
