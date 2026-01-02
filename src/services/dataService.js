import { supabase } from './supabaseClient';

const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
        'Authorization': `Bearer ${session?.access_token || ''}`,
        'Content-Type': 'application/json'
    };
};

export const fetchTodayFixtures = async () => {
    try {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/fixtures/today', { headers });
        if (!res.ok) throw new Error('Failed to fetch fixtures');
        return await res.json();
    } catch (error) {
        console.error(error);
        return { fixtures: [] };
    }
};

export const fetchUpcomingFixtures = async () => {
    try {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/fixtures/upcoming', { headers });
        if (!res.ok) throw new Error('Failed to fetch upcoming');
        return await res.json();
    } catch (error) {
        console.error(error);
        return { fixtures: [] };
    }
};

export const fetchFixtureDetails = async (id) => {
    try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/fixtures/${id}`, { headers });
        if (!res.ok) throw new Error('Failed to fetch fixture details');
        return await res.json();
    } catch (error) {
        console.error(error);
        return null;
    }
};
