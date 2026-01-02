import { useState, useEffect, useRef } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useChat } from '../hooks/useChat'
import { useAuth } from '../contexts/AuthContext'
import { cn } from '../lib/utils'
import { User, Bot, Menu, Send, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PushToggle from '../components/features/PushToggle'

export default function Chat() {
    const { messages, loading, sendMessage } = useChat()
    const { user, signOut } = useAuth()
    const navigate = useNavigate()
    const [inputText, setInputText] = useState('')
    const scrollRef = useRef(null)

    useEffect(() => {
        if (!user && !loading) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    const handleSend = () => {
        if (!inputText.trim()) return
        sendMessage(inputText)
        setInputText('')
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSend()
        }
    }

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    }

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            {/* Header */}
            <header className="p-4 border-b border-border bg-card flex items-center justify-between sticky top-0 z-10 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-primary/20 rounded-lg flex items-center justify-center text-primary border border-primary/20">
                        <Bot size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white leading-none">ZapBet AI</h1>
                        <span className="text-xs text-primary font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Online
                        </span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <PushToggle />
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white" onClick={handleSignOut}>
                        <LogOut size={20} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white" onClick={() => navigate('/dashboard')}>
                        <Menu size={20} />
                    </Button>
                </div>
            </header>

            {/* Chat Area */}
            <main className="flex-1 p-4 overflow-y-auto w-full max-w-lg mx-auto space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-muted-foreground mt-10 text-sm animate-in fade-in zoom-in duration-500">
                        <p className="mb-2">"O que tem hoje de interessante?"</p>
                        <p>"Quero algo agressivo hoje"</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={cn(
                        "flex gap-3 animate-in slide-in-from-bottom-2 duration-300",
                        msg.role === 'user' ? "flex-row-reverse" : ""
                    )}>
                        <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border",
                            msg.role === 'user'
                                ? "bg-secondary border-border"
                                : "bg-primary/10 border-primary/20"
                        )}>
                            {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-primary" />}
                        </div>

                        <div className={cn(
                            "rounded-2xl p-3 text-sm max-w-[85%] shadow-sm",
                            msg.role === 'user'
                                ? "bg-secondary text-white rounded-tr-sm"
                                : "bg-card border border-border text-gray-200 rounded-tl-sm"
                        )}>
                            <p>{msg.content}</p>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex gap-3 animate-pulse">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                            <Bot size={14} className="text-primary" />
                        </div>
                        <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-3 flex items-center gap-1 h-10 w-16">
                            <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce delay-0" />
                            <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce delay-150" />
                            <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce delay-300" />
                        </div>
                    </div>
                )}

                <div ref={scrollRef} />
            </main>

            {/* Input Area */}
            <footer className="p-4 border-t border-border bg-background w-full max-w-lg mx-auto">
                <div className="flex gap-2 relative">
                    <Input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Pergunte sobre jogos, odds ou estratégias..."
                        className="bg-card border-border text-white focus-visible:ring-primary pr-12 h-12 rounded-xl"
                        disabled={loading}
                    />
                    <Button
                        className="absolute right-1 top-1 h-10 w-10 p-0 rounded-lg bg-primary text-black hover:bg-primary/90 hover:scale-105 transition-all"
                        onClick={handleSend}
                        disabled={!inputText.trim() || loading}
                    >
                        <Send size={18} />
                    </Button>
                </div>
            </footer>
        </div>
    )
}
