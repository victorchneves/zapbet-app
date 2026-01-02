import { useState, useCallback, useEffect } from 'react';
import { sendMessageToAI } from '../services/aiService';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export const useChat = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [threadId, setThreadId] = useState(null);

    // Load History
    useEffect(() => {
        if (!user) return;

        const loadHistory = async () => {
            try {
                const { data, error } = await supabase
                    .from('ai_threads')
                    .select('id, messages')
                    .eq('user_id', user.id)
                    .single();

                if (data) {
                    setThreadId(data.id);
                    setMessages(data.messages || []);
                }
            } catch (err) {
                console.error('Failed to load chat history:', err);
            }
        };

        loadHistory();
    }, [user]);

    const sendMessage = useCallback(async (content) => {
        if (!content.trim()) return;

        // Optimistic UI update
        const userMsg = { id: Date.now().toString(), role: 'user', content, timestamp: new Date() };
        setMessages((prev) => [...prev, userMsg]);
        setLoading(true);

        try {
            // Call Real Backend
            const responseContent = await sendMessageToAI(content);

            const aiMsg = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseContent,
                timestamp: new Date()
            };

            setMessages((prev) => [...prev, aiMsg]);
        } catch (error) {
            console.error(error);
            const errorMsg = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Erro: " + error.message
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    }, []);

    return { messages, loading, sendMessage };
};
