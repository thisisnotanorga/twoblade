import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_DOMAIN } from '$env/static/public';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const emailData = await request.json();
        const { from, to, subject, body } = emailData;
        console.log('Received request:', { from, to, subject, body });

        // const emailRegex = /^[a-zA-Z0-9._%+-]+#[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        // if (!emailRegex.test(from) || !emailRegex.test(to)) {
        //     return json({ status: 'error', message: 'Invalid email format. Use user#domain.com' }, { status: 400 });
        // }

        console.log(`Sending to ${PUBLIC_DOMAIN}/api/send...`);
        const apiUrl = `https://${PUBLIC_DOMAIN}/api/send`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ from, to, subject, body })
        });

        
        console.log('Response status:', response.status);
        const responseText = await response.text();
        console.log('Response body:', responseText);

        if (!response.ok) {
            return json({ 
                status: 'error', 
                message: `Server responded with ${response.status}: ${responseText}` 
            }, { status: response.status });
        }

        try {
            const result = JSON.parse(responseText);
            return json({ status: 'success', result }, { status: 200 });
        } catch (e) {
            return json({ 
                status: 'error', 
                message: 'Invalid JSON response from server' 
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Fetch error:', error);
        return json({ 
            status: 'error', 
            message: 'Failed to connect to SHARP server:\n' + error.message 
        }, { status: 500 });
    }
};