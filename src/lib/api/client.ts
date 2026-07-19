const BASE = 'http://127.0.0.1:8000';

type Query = Record<string, string | number>;

interface RequestOptions {
	query?:  Query;
	method?: string;
	body?:   unknown;
}

export class ApiError extends Error {
	constructor(readonly status: number, readonly path: string) {
		super(`Request failed (${status}): ${path}`);
		this.name = 'ApiError';
	}
}

function buildUrl(path: string, query?: Query): string {
	if (!query) return `${BASE}${path}`;
	const qs = new URLSearchParams(
		Object.entries(query).map(([k, v]) => [k, String(v)])
	).toString();
	return `${BASE}${path}${qs ? `?${qs}` : ''}`;
}

function send(path: string, { query, method = 'GET', body }: RequestOptions): Promise<Response> {
	return fetch(buildUrl(path, query), {
		method,
		headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
		body:    body !== undefined ? JSON.stringify(body) : undefined,
	});
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
	const res = await send(path, opts);
	if (!res.ok) throw new ApiError(res.status, path);
	return res.json() as Promise<T>;
}

export async function tryRequest<T>(path: string, opts: RequestOptions = {}): Promise<T | null> {
	try {
		const res = await send(path, opts);
		return res.ok ? ((await res.json()) as T) : null;
	} catch {
		return null;
	}
}

export async function requestOk(path: string, opts: RequestOptions = {}): Promise<boolean> {
	try {
		return (await send(path, opts)).ok;
	} catch {
		return false;
	}
}

export async function tryRequestBinary(path: string, opts: RequestOptions = {}): Promise<ArrayBuffer | null> {
	try {
		const res = await send(path, opts);
		return res.ok ? await res.arrayBuffer() : null;
	} catch {
		return null;
	}
}
