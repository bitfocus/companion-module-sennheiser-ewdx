import { combineRgb, CompanionPresetDefinitions } from '@companion-module/base'
import { ModuleInstance } from './main.js'
import { DeviceModel } from './receiver.js'

export function UpdatePresets(self: ModuleInstance): void {
	// Helper function to create presets
	const createPreset = (receiver: number): CompanionPresetDefinitions => ({
		[`receiver_channel_status_${receiver}`]: {
			type: 'button',
			category: 'Channel Status',
			name: `Channel Status RX${receiver + 1}`,
			style: {
				size: 9,
				text: `Channel Status RX${receiver + 1}`,
				color: combineRgb(255, 255, 255),
				bgcolor: 0,
				show_topbar: false,
			},
			feedbacks: [
				{
					feedbackId: 'receiverState',
					options: {
						receiver: receiver,
					},
				},
			],
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

	const presets: CompanionPresetDefinitions = {}

	const maxReceivers = self.device.model === DeviceModel.EM4 ? 4 : 2

	for (let i = 0; i < maxReceivers; i++) {
		Object.assign(presets, createPreset(i))
	}

	self.setPresetDefinitions(presets)
}
