import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";

import { useAuthStore } from "../store/authStore";
import type { TokenResponse } from "../types/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

type RetryRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const apiClient = axios.create({
	baseURL: API_BASE_URL,
	timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
	const token = useAuthStore.getState().accessToken;
	if (token) {
		const headers = config.headers instanceof AxiosHeaders ? config.headers : new AxiosHeaders(config.headers);
		headers.set("Authorization", `Bearer ${token}`);
		config.headers = headers;
	}
	return config;
});

async function refreshAccessToken(): Promise<TokenResponse | null> {
	const { refreshToken, setAccessTokens, clearSession } = useAuthStore.getState();
	if (!refreshToken) {
		return null;
	}

	try {
		const response = await axios.post<TokenResponse>(`${API_BASE_URL}/auth/refresh`, {
			refresh_token: refreshToken,
		});
		setAccessTokens({
			accessToken: response.data.access_token,
			refreshToken: response.data.refresh_token,
		});
		return response.data;
	} catch {
		clearSession();
		return null;
	}
}

apiClient.interceptors.response.use(
	(response) => response,
	async (error: AxiosError) => {
		const originalRequest = error.config as RetryRequestConfig | undefined;
		const status = error.response?.status;
		if (!originalRequest || status !== 401 || originalRequest._retry) {
			return Promise.reject(error);
		}
		if ((originalRequest.url ?? "").includes("/auth/refresh")) {
			return Promise.reject(error);
		}

		originalRequest._retry = true;
		const refreshed = await refreshAccessToken();
		if (!refreshed) {
			return Promise.reject(error);
		}

		const headers =
			originalRequest.headers instanceof AxiosHeaders
				? originalRequest.headers
				: new AxiosHeaders(originalRequest.headers);
		headers.set("Authorization", `Bearer ${refreshed.access_token}`);
		originalRequest.headers = headers;

		return apiClient(originalRequest);
	},
);
