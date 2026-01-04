import { supabase } from './supabaseClient';

export const sendMessageToAI = async (message) => {
    try {
        // Get current session token
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            throw new Error('Usuário não autenticado');
        }

        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                message,
                action: 'chat'
            })
        });

        if (!response.ok) {
            let errorData;
            const textPromise = response.text();

            try {
                errorData = JSON.parse(await textPromise);
            } catch (jsonError) {
                // If we can't parse JSON, it might be an HTML error page
                const rawText = await textPromise;
                console.error('Non-JSON error response:', rawText);
                throw new Error(`Erro no servidor (${response.status}): Verifique os logs.`);
            }

            // If we parsed successfully, throw the backend error
            throw new Error(errorData.error || 'Erro na comunicação com a IA');
        }

        const data = await response.json();
        return data.response;

    } catch (error) {
        console.error('AI Service Error:', error);
        throw error; // Re-throw to be handled by UI
    }
};
