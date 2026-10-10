import type { SomeButtonGraphicsElement, ButtonGraphicsTextElement } from '@companion-module/base'
import { graphics } from 'companion-module-utils'
import { CHG70N, ChargingBayState, ChargingBayWarnings, ChargingDevice } from './chg70n.js'
import { icons } from './graphics.js'

const dot = (color: number): string =>
	graphics.toPNG64({ width: 12, height: 12, image: graphics.circle({ radius: 6, color, opacity: 255 }) })
const normalDot = dot(0x00ff00)
const errorDot = dot(0xff0000)

export function getChargerDisplayState(charger: CHG70N, bayIndex: number): Record<string, string | boolean | number> {
	const bay = charger.chargingBays[bayIndex]
	const connected = charger.deviceConnected && !!bay
	const hasBattery = connected && bay.chargingDevice !== ChargingDevice.NONE && bay.chargingDevice !== ChargingDevice.UNKNOWN
	const gauge = Math.round(Math.max(0, Math.min(100, Number(bay?.batGauge) || 0)))
	const minutes = Number(bay?.timeToFull)
	const warning = (kind: ChargingBayWarnings): boolean => connected && bay.warnings.includes(kind)
	return {
		name: !connected ? 'OFFLINE' : ChargingDevice[bay.chargingDevice] || 'UNKNOWN',
		batteryLabel: hasBattery ? `${gauge}%` : '—',
		batteryColor: !hasBattery ? 0x1f2937 : gauge > 60 ? 0x14532d : gauge > 20 ? 0x713f12 : 0x7f1d1d,
		fullLabel: hasBattery && Number.isFinite(minutes) && minutes >= 0 ? `Full: ${Math.floor(minutes)} min` : '—',
		statusLabel: connected ? `Bay ${bayIndex + 1} · ${(ChargingBayState[bay.state] || 'UNKNOWN').replaceAll('_', ' ')}` : 'NO LINK',
		stateDot: connected && bay.state === ChargingBayState.NORMAL ? normalDot : errorDot,
		syncError: connected && bay.syncError,
		overcurrent: warning(ChargingBayWarnings.OvercurrentDetected),
		temperature: warning(ChargingBayWarnings.BatteryTempOutOfRange),
		communicationError: warning(ChargingBayWarnings.BatteryComError),
		chargeError: warning(ChargingBayWarnings.BatteryNotChargeable) || warning(ChargingBayWarnings.BatteryNotDischargeable),
		identification: connected && bay.identification,
	}
}

export function chargerDisplayElements(): SomeButtonGraphicsElement[] {
	const pct = (pixels: number): number => (pixels / 72) * 100
	const bounds = (x: number, y: number, width: number, height: number) => ({
		x: pct(x), y: pct(y), width: pct(width), height: pct(height),
	})
	const state = (field: string) => ({ isExpression: true as const, value: `$(local:status).${field}` })
	const text = (id: string, field: string, x: number, y: number, width: number, height: number, fontSize: number): ButtonGraphicsTextElement => ({
		type: 'text', id, ...bounds(x, y, width, height), text: state(field),
		font: 'companion-sans', fontsize: (fontSize / height) * 100 * 1.2,
		fontsizeAllowShrink: true, halign: 'center', valign: 'center', color: 0xffffff,
	})
	const icon = (id: string, image: string, x: number, y: number, enabled: string): SomeButtonGraphicsElement => ({
		type: 'image', id, ...bounds(x, y, 16, 16), base64Image: image, fillMode: 'fit', enabled: state(enabled),
	})
	return [
		{ type: 'box', id: 'background', color: 0x080b10 },
		{ type: 'box', id: 'header', ...bounds(0, 0, 72, 19), color: 0x111827 },
		{ type: 'image', id: 'bay-state', ...bounds(4, 3, 12, 12), base64Image: state('stateDot'), fillMode: 'fit' },
		{ type: 'box', id: 'battery', ...bounds(20, 3, 30, 13), color: state('batteryColor'), borderColor: 0xffffff, borderWidth: pct(1), borderPosition: 'inside' },
		{ type: 'box', id: 'battery-terminal', ...bounds(50, 7.5, 3, 4), color: 0xffffff },
		text('battery-label', 'batteryLabel', 21, 4, 28, 11, 9),
		icon('sync-error', icons.warning, 54, 1, 'syncError'),
		{ ...text('device-name', 'name', 2, 21, 68, 13, 11), weight: 'bold' },
		text('charging-time', 'fullLabel', 2, 35, 68, 12, 9),
		{ ...text('status-label', 'statusLabel', 2, 47, 68, 9, 7), color: 0xcbd5e1 },
		{ type: 'box', id: 'footer', ...bounds(0, 56, 72, 16), color: 0x111827 },
		icon('overcurrent', icons.overcurrent, 2, 56, 'overcurrent'),
		icon('temperature', icons.temperature, 19, 56, 'temperature'),
		icon('communication-error', icons.communicationError, 36, 56, 'communicationError'),
		icon('charge-error', icons.chargeError, 54, 56, 'chargeError'),
		{ type: 'box', id: 'identification', ...bounds(0, 18, 72, 2), color: 0x00ff00, enabled: state('identification') },
	]
}
