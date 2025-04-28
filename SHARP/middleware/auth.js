import { sql } from '../db.js';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const alg = 'HS256';

export async function validateAuthToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }

    try {
        const { payload } = await jwtVerify(token, secret, {
            algorithms: [alg]
        });

        // check if code is still valid
        const codes = await sql`
            SELECT user_id FROM user_secret_codes 
            WHERE code = ${payload.code}
        `;

        if (!codes.length) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid or expired session' 
            });
        }

        // get user data
        const users = await sql`
            SELECT id, username, domain, is_banned
            FROM users 
            WHERE id = ${payload.userId}
        `;

        if (!users.length || users[0].is_banned) {
            return res.status(403).json({
                success: false,
                message: 'Account not found or banned'
            });
        }

        req.user = users[0];
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ 
            success: false, 
            message: error.code === 'ERR_JWT_EXPIRED' ? 'Token expired' : 'Invalid token'
        });
    }
}
