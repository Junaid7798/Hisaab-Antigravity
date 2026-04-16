import { writable } from 'svelte/store';
import type { User, Session } from '@supabase/supabase-js';

export const currentUser = writable<User | null>(null);
export const currentSession = writable<Session | null>(null);
export const authLoading = writable<boolean>(true);
