
const apiKey = '5a87dee6bf5543f100b4b1eb3fc64c46';
const date = '2026-01-26';

async function test() {
    console.log(`Fetching from API-Football for date: ${date}`);
    const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
        headers: {
            'x-apisports-key': apiKey,
            'x-rapidapi-host': 'v3.football.api-sports.io'
        }
    });

    if (!res.ok) {
        console.error('API Error:', res.status, res.statusText);
        const text = await res.text();
        console.error('Body:', text);
        return;
    }

    const data = await res.json();
    console.log('Response status (json):', JSON.stringify(data.errors || {}, null, 2));
    console.log('Results count:', data.results);
    console.log('Response items:', data.response ? data.response.length : 0);

    if (data.response && data.response.length > 0) {
        console.log('First fixture:', data.response[0].fixture);
    }
}

test();
