import { writable } from 'svelte/store';
import type { UserWithSettings } from '$lib/types/user';

export const USER_DATA = writable<UserWithSettings>(null);
