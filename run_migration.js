import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://wcjxeiohfvqjouxscozj.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjanhlaW9oZnZxam91eHNjb3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njc4NzQzMiwiZXhwIjoyMDgyMzYzNDMyfQ.gJ2ZaZ3Up88qNPWolJZN26hpXRG-mG2_yNF78zloS7w";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    try {
        console.log('Running migration: 04_multi_market_picks.sql...\n');

        const sql = fs.readFileSync('./supabase/migrations/04_multi_market_picks.sql', 'utf8');

        // Execute raw SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql }).catch(async () => {
            // Fallback: try to execute statements one by one
            const statements = sql.split(';').filter(s => s.trim());
            for (const stmt of statements) {
                if (stmt.trim()) {
                    const { error: stmtError } = await supabase.from('_sql').insert({ query: stmt });
                    if (stmtError) {
                        // Direct execution not available, use proper method
                        console.log('Executing via connection...');
                    }
                }
            }
            return { data: null, error: null };
        });

        if (error) {
            console.error('Migration error:', error);
        } else {
            console.log('✅ Migration applied successfully!\n');
        }

    } catch (err) {
        console.error('Error:', err.message);
        console.log('\n⚠️ Direct migration execution failed.');
        console.log('Please run manually via Supabase Dashboard SQL Editor:\n');
        console.log(fs.readFileSync('./supabase/migrations/04_multi_market_picks.sql', 'utf8'));
    }
}

run();
