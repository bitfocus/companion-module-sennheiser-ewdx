import { CompanionPresetDefinitions } from '@companion-module/base'
import type { ModuleInstance, ModuleTypes } from './main.js'
import { DeviceModel } from './ewdx.js'
import { EWDXReceiver } from './ewdxReceiver.js'
import { CHG70N } from './chg70n.js'
import { receiverDisplayElements } from './receiverDisplay.js'
import { chargerDisplayElements } from './chargerDisplay.js'
import { ButtonGraphicsDecorationType } from '@companion-module/base'

export function UpdatePresets(self: ModuleInstance): void {
	const presets: CompanionPresetDefinitions<ModuleTypes> = {}

	if (self.device instanceof EWDXReceiver) {
		const createPreset = (receiver: number): CompanionPresetDefinitions<ModuleTypes> => ({
			[`receiver_channel_status_${receiver}`]: {
				type: 'layered',
				name: `Channel Status RX${receiver + 1}`,
				canvas: { decoration: ButtonGraphicsDecorationType.None },
				elements: receiverDisplayElements(),
				localVariables: [
					{ variableName: 'status', variableType: 'feedback', feedbackId: 'receiverDisplay', options: { receiver } },
				],
				feedbacks: [],
				steps: [
					{
						down: [
							{
								actionId: 'rx_identification',
								options: {
									receiver: receiver,
									ident: true,
								},
							},
						],
						up: [],
					},
				],
			},
		})
		const maxReceivers = self.device.model === DeviceModel.EM4 ? 4 : 2

		for (let i = 0; i < maxReceivers; i++) {
			Object.assign(presets, createPreset(i))
		}
	} else if (self.device instanceof CHG70N) {
		const createPreset = (bay: number): CompanionPresetDefinitions<ModuleTypes> => ({
			[`bay_status_${bay}`]: {
				type: 'layered',
				name: `Status Charging Bay ${bay + 1}`,
				canvas: { decoration: ButtonGraphicsDecorationType.None },
				elements: chargerDisplayElements(),
				localVariables: [
					{ variableName: 'status', variableType: 'feedback', feedbackId: 'chargerDisplay', options: { bay } },
				],
				feedbacks: [],
				steps: [
					{
						down: [
							{
								actionId: 'bay_identification',
								options: {
									bay: bay,
									setting: true,
								},
							},
						],
						up: [],
					},
				],
			},
		})

		for (let i = 0; i < 2; i++) {
			Object.assign(presets, createPreset(i))
		}
	}

	self.setPresetDefinitions(
		[
			{
				id: 'status',
				name: self.device instanceof EWDXReceiver ? 'Channel Status' : 'Bay Status',
				definitions: Object.keys(presets),
			},
		],
		presets,
	)
}
