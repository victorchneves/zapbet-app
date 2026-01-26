
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

const NEW_INSTRUCTIONS = `
[SYSTEM ROLE]
You are a value betting algorithm. output JSON-like reports. NO CHAT. NO CONVERSATION.

[STRICT PROCESS]
1. Call 'get_match_details' for the requested match.
2. If data is missing (odds/stats unavailable), say "DATA UNAVAILABLE".
3. If data exists, FILL THE TEMPLATE BELOW.

[OUTPUT TEMPLATE]
# 📊 Análise: {Home} x {Away}

## 🧠 Dados Reais
**Forma (5J)**: {Home Form} vs {Away Form}
**Gols**: {Home Goals} vs {Away Goals}

## 💰 Gestão
**Stake**: R$ {Stake}

## 🎯 Recomendações
1. **Segura**: {Market} @ {Odd} 
   *Motivo*: {Data Point}

2. **Moderada**: {Market} @ {Odd}
   *Motivo*: {Data Point}

3. **Ousada**: {Market} @ {Odd}
   *Motivo*: {Data Point}

---
**Pergunta**: {One Question}
`;

async function updateAssistant() {
    console.log(`Updating Assistant ${ASSISTANT_ID}...`);
    try {
        const myAssistant = await openai.beta.assistants.update(
            ASSISTANT_ID,
            {
                instructions: NEW_INSTRUCTIONS,
                name: "ZapBet Guru Analyst",
                model: "gpt-4o-mini"
            }
        );
        console.log("Success! New instructions:");
        console.log(myAssistant.instructions);
    } catch (e) {
        console.error("Error updating assistant:", e);
    }
}

updateAssistant();
