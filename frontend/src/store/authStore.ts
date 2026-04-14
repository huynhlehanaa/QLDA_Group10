import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { UserProfile, UserRole } from "../types/auth";

export interface AuthState {
	accessToken: string | null;
	refreshToken: string | null;
	role: UserRole | null;
	userId: string | null;
	fullName: string | null;
	avatarUrl: string | null;
	mustChangePassword: boolean;
	profile: UserProfile | null;
	setSession: (payload: {
		accessToken: string;
		refreshToken: string;
		role: UserRole;
		userId: string;
		fullName: string;
		avatarUrl?: string | null;
		mustChangePassword: boolean;
	}) => void;
	setAccessTokens: (payload: { accessToken: string; refreshToken: string }) => void;
	setProfile: (profile: UserProfile) => void;
	clearSession: () => void;
}

const initialState = {
	accessToken: null,
	refreshToken: null,
	role: null,
	userId: null,
	fullName: null,
	avatarUrl: null,
	mustChangePassword: false,
	profile: null,
};

export const useAuthStore = create<AuthState>()(
	persist(
		(set) => ({
			...initialState,
			setSession: (payload) =>
				set({
					accessToken: payload.accessToken,
					refreshToken: payload.refreshToken,
					role: payload.role,
					userId: payload.userId,
					fullName: payload.fullName,
					avatarUrl: payload.avatarUrl ?? null,
					mustChangePassword: payload.mustChangePassword,
				}),
			setAccessTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
			setProfile: (profile) =>
				set({
					profile,
					fullName: profile.full_name,
					avatarUrl: profile.avatar_url ?? null,
					role: profile.role,
					userId: profile.id,
				}),
			clearSession: () => set({ ...initialState }),
		}),
		{
			name: "auth-session",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				accessToken: state.accessToken,
				refreshToken: state.refreshToken,
				role: state.role,
				userId: state.userId,
				fullName: state.fullName,
				avatarUrl: state.avatarUrl,
				mustChangePassword: state.mustChangePassword,
			}),
		},
	),
);
