import { combineRgb, CompanionPresetDefinitions } from '@companion-module/base'
import { ModuleInstance } from './main.js'
import { DeviceModel } from './ewdx.js'
import { EWDXReceiver } from './ewdxReceiver.js'
import { CHG70N } from './chg70n.js'

export function UpdatePresets(self: ModuleInstance): void {
	// Helper function to create presets
	const presets: CompanionPresetDefinitions = {}

	if (self.device instanceof EWDXReceiver) {
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
		const maxReceivers = self.device.model === DeviceModel.EM4 ? 4 : 2

		for (let i = 0; i < maxReceivers; i++) {
			Object.assign(presets, createPreset(i))
		}
	} else if (self.device instanceof CHG70N) {
		const createPreset = (bay: number): CompanionPresetDefinitions => ({
			[`bay_status_${bay}`]: {
				type: 'button',
				category: 'Bay Status',
				name: `Status Charging Bay ${bay + 1}`,
				style: {
					size: 9,
					text: `Status Bay ${bay + 1}`,
					color: combineRgb(255, 255, 255),
					bgcolor: 0,
					show_topbar: false,
				},
				feedbacks: [
					{
						feedbackId: 'baystate',
						options: {
							bay: bay,
						},
					},
				],
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

	self.setPresetDefinitions(presets)
}
