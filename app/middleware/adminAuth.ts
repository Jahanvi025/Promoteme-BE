import axios from 'axios';
import { Request, Response, NextFunction } from 'express';

interface AdminAuthResponse {
    status: number;
    message: string;
    data: {
        id: number;
        email: string;
        password: string;
        accessToken: string;
    }[];
}

export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const url = `${process.env.GATEWAY_URL}/users/adminDetail`

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const response = await axios.get<AdminAuthResponse>(url, {
            params: { token },
        });

        const accessToken = response.data.data[0]?.accessToken;

        if (accessToken === token) {
            next();
        } else {
            res.status(403).json({ message: 'Invalid token' });
        }
    } catch (error) {
        console.error('Error during token validation:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
