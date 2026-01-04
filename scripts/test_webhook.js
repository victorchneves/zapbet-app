import dotenv from 'dotenv';
dotenv.config();

// Fix for imports if running as pure node script with localized paths
// We need to mock the request/response objects
import handler from '../api/webhooks/kirvano.js';

const mockReq = {
    method: 'POST',
    body: {
        event: 'SALE_APPROVED',
        sale_id: 'TEST_LOCAL_' + Date.now(),
        customer: {
            email: 'gleciofonseca01@gmail.com' // Using the email from your JSON
        },
        fiscal: {
            total_value: 98.00
        }
    }
};

const mockRes = {
    status: (code) => {
        console.log(`Response Status: ${code}`);
        return mockRes;
    },
    json: (data) => {
        console.log('Response JSON:', data);
        return mockRes;
    }
};

console.log('--- Simulating Kirvano Webhook ---');
handler(mockReq, mockRes)
    .then(() => console.log('--- Test Completed ---'))
    .catch(err => console.error('Test Failed:', err));
