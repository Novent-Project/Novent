const GAME_LABELS: Record<string, string> = {
	AC:      'Assetto Corsa',
	ACC:     'Assetto Corsa Competizione',
	iRacing: 'iRacing',
	LMU:     'Le Mans Ultimate',
};

const GAME_SHORT: Record<string, string> = {
	AC:      'AC',
	ACC:     'ACC',
	iRacing: 'iRacing',
	LMU:     'LMU',
};

const NAME_OVERRIDES: Record<string, string> = {
	ks_porsche_919_hybrid: 'Porsche 919 Hybrid',
	ks_red_bull_ring:      'Red Bull Ring',
	ks_nurburgring:        'Nürburgring',
	imola:                 'Imola Circuit',
	spa:                   'Circuit de Spa-Francorchamps',
};

export function gameLabel(key: string): string {
	return GAME_LABELS[key] ?? key;
}

export function gameShort(key: string): string {
	return GAME_SHORT[key] ?? key;
}

export function formatName(raw: string): string {
	if (!raw) return 'Unknown';
	const override = NAME_OVERRIDES[raw.toLowerCase()];
	if (override) return override;
	return raw
		.replace(/^(ks_|acu_|rt_)/i, '')
		.split('_')
		.map(w => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

export function formatDateTime(dt?: string): string {
	return dt ? dt.replace('_', ' ') : '—';
}
