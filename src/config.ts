import { Regex, type SomeCompanionConfigField } from '@companion-module/base'
import { DeviceModel } from './ewdx.js'

export interface ModuleConfig {
	host: string
	model: DeviceModel
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
			label: 'Select Receiver Model',
			default: DeviceModel.EM4,
			choices: [
				{ id: DeviceModel.EM2, label: 'EM2' },
				{ id: DeviceModel.EM2_DANTE, label: 'EM2 Dante' },
				{ id: DeviceModel.EM4, label: 'EM4' },
				{ id: DeviceModel.CHG70N, label: 'CHG70N-C' },
			],
		},
	]
}
