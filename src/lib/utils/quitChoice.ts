export type QuitAction = 'tray' | 'quit';

const REMEMBER_KEY = 'novent:quit-remember';
const ACTION_KEY = 'novent:quit-remember-action';

export function loadRememberedQuitChoice(): QuitAction | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		if (localStorage.getItem(REMEMBER_KEY) !== 'true') return null;
		const action = localStorage.getItem(ACTION_KEY);
		return action === 'tray' || action === 'quit' ? action : null;
	} catch {
		return null;
	}
}

export function loadRememberFlag(): boolean {
	if (typeof localStorage === 'undefined') return false;
	try {
		return localStorage.getItem(REMEMBER_KEY) === 'true';
	} catch {
		return false;
	}
}

export function setRememberFlag(value: boolean) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(REMEMBER_KEY, String(value));
		if (!value) localStorage.removeItem(ACTION_KEY);
	} catch {
	}
}

export function setRememberedQuitAction(action: QuitAction) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(ACTION_KEY, action);
	} catch {
	}
}