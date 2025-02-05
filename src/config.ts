import { Regex, type SomeCompanionConfigField } from '@companion-module/base'
import { ReceiverModel } from './receiver.js'

export interface ModuleConfig {
	host: string
	model: ReceiverModel
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
			default: ReceiverModel.EM4,
			choices: [
				{ id: ReceiverModel.EM2, label: 'EM2' },
				{ id: ReceiverModel.EM2_DANTE, label: 'EM2 Dante' },
				{ id: ReceiverModel.EM4, label: 'EM4' },
			],
		},
	]
}
