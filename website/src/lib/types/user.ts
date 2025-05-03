export interface UserSettings {
    notifications_enabled: boolean;
}

export interface UserSessionData {
    id: number;
    username: string;
    domain: string;
    is_banned: boolean;
    created_at: string;
}

export interface User extends UserSessionData {
    settings: UserSettings;
}

export type UserWithSettings = User | null;
