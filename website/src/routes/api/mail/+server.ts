import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_DOMAIN } from '$env/static/public';

export const POST: RequestHandler = async ({ request }) => {
    try {
        // Check server status first
        const statusUrl = `https://${PUBLIC_DOMAIN}/api/server/health`;
        const statusResponse = await fetch(statusUrl);
        
        if (!statusResponse.ok) {
            return json({ 
                status: 'error', 
                message: 'Server is not available' 
            }, { status: 503 });
        }
        console.log(await statusResponse.json())
        const emailData = await request.json();
        const { from, to, subject, body, content_type = 'text/plain', html_body } = emailData;
        console.log('Received request:', { from, to, subject, body, content_type, html_body });

        console.log(`Sending to ${PUBLIC_DOMAIN}/api/send...`);
        const apiUrl = `https://${PUBLIC_DOMAIN}/api/send`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ from, to, subject, body, content_type, html_body })
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