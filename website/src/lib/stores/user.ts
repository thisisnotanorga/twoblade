import { writable } from 'svelte/store';

export type User = {
    id: number;
    username: string;
    domain: string;
    is_banned: boolean;
    created_at: string;
} | null;

export const USER_DATA = writable<User>(null);
