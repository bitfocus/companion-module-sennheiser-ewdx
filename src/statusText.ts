export function formatBatteryLabel(type: string, lifetime: number, gauge: number): string {
	const minutes = Math.floor(Number(lifetime))
	if (type === 'Battery' && Number.isFinite(minutes) && minutes > 0) {
		return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}h`
	}
	return `${Math.round(Math.max(0, Math.min(100, Number(gauge) || 0)))}%`
}
