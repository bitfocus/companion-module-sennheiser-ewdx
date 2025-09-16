import { Regex, type SomeCompanionConfigField } from '@companion-module/base'
import { DeviceModel } from './ewdx.js'

export type ProtocolVersion = 'SCPv1' | 'SCPv2'

export interface ModuleConfig {
	host: string
	model: DeviceModel
	protocol: ProtocolVersion
	thirdPartyPassword: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Receiver IP',
			width: 12,
			regex: Regex.IP,
		},
		{
			type: 'dropdown',
			width: 12,
			id: 'model',
			label: 'Select Device Model',
			default: DeviceModel.EM4,
			choices: [
				{ id: DeviceModel.EM2, label: 'EM2' },
				{ id: DeviceModel.EM2_DANTE, label: 'EM2 Dante' },
				{ id: DeviceModel.EM4, label: 'EM4' },
				{ id: DeviceModel.CHG70N, label: 'CHG70N-C' },
			],
		},
		{
			type: 'dropdown',
			width: 12,
			id: 'protocol',
			label: 'Communication Protocol',
			default: 'SCPv1',
			choices: [
				{ id: 'SCPv1', label: 'SCPv1 (Firmware < 4.0.0)' },
				{ id: 'SCPv2', label: 'SCPv2 (Firmware >= 4.0.0)' },
			],
		},
		{
			type: 'textinput',
			id: 'thirdPartyPassword',
			label: 'Third Party Password',
			width: 12,
			tooltip: 'Password configured in Sennheiser Control Cockpit for third party access (required for SCPv2)',
			isVisible: (options) => {
				return options.protocol === 'SCPv2'
			},
		},
	]
}
