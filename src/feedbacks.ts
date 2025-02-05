import { combineRgb, CompanionFeedbackDefinitions } from '@companion-module/base'
import type { ModuleInstance } from './main.js'
import { graphics } from 'companion-module-utils'
import { OptionsBar, OptionsCorner, OptionsIcon, OptionsRect } from 'companion-module-utils/dist/graphics.js'
import { DantePortMapping, MuteOptions, MuteOptionsTable, ReceiverModel, SyncSettings } from './receiver.js'
import { images } from './graphics.js'

export function UpdateFeedbacks(self: ModuleInstance): void {
	function getChannelOptions(): { id: number; label: string }[] {
		const maxChannels = self.receiver.model === ReceiverModel.EM4 ? 4 : 2
		return Array.from({ length: maxChannels }, (_, i) => ({
			id: i,
			label: `Channel ${i + 1}`,
		}))
	}

	const feedbacks: CompanionFeedbackDefinitions = {
		ActiveAntenna: {
			name: 'Active Antenna',
			description:
				'Becomes active if the selected antenna for the selected channel is currently being used as the primary receive antenna',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
				{
					id: 'antenna',
					type: 'dropdown',
					label: 'Antenna',
					default: '1',
					choices: [
						{ id: '1', label: 'Antenna A' },
						{ id: '2', label: 'Antenna B' },
					],
				},
			],
			callback: (feedback) => {
				const channel = Number(feedback.options.receiver)

				return self.receiver.channels[channel].activeAntenna == feedback.options.antenna
			},
		},
		device_encryption: {
			name: 'Device: Encryption',
			description: 'Becomes active if encryption is enabled on the receiver',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [],
			callback: () => {
				return self.receiver.encryption
			},
		},
		device_link_density_mode: {
			name: 'Device: Link Density Mode',
			description: 'Becomes active if the Link Density mode is enabled on the receiver',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [],
			callback: () => {
				return self.receiver.linkDensityMode
			},
		},
		rx_encryption_error: {
			name: 'RX: Encryption Error',
			description: 'Becomes active if an encryption error occurs on the selected channel',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
			],
			callback: (feedback) => {
				const channel = Number(feedback.options.receiver)
				return self.receiver.channels[channel].hasAes256Error
			},
		},
		rx_af_peak_warning: {
			name: 'RX: AF Peak Warning',
			description: 'Becomes active if the AF peaks on the selected channel',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
			],
			callback: (feedback) => {
				const channel = Number(feedback.options.receiver)
				return self.receiver.channels[channel].hasAfPeakWarning
			},
		},
		rx_identification: {
			name: 'RX: Identification',
			description: 'Becomes active if the selected receiver channels is currently being identified (LED blinks)',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
			],
			callback: (feedback) => {
				const channel = Number(feedback.options.receiver)
				return self.receiver.channels[channel].identification
			},
		},
		rx_muted: {
			name: 'RX: Muted',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
			],
			callback: (feedback) => {
				const channel = Number(feedback.options.receiver)
				return self.receiver.channels[channel].muted
			},
		},
		tx_mute_config_sk: {
			name: 'RX: Mute Config [SK(M)]',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
				{
					id: 'setting',
					type: 'dropdown',
					label: 'Mute Setting',
					default: MuteOptions.off,
					choices: [
						{ id: MuteOptions.off, label: 'Off' },
						{ id: MuteOptions.rf_mute, label: 'RF Mute' },
						{ id: MuteOptions.af_mute, label: 'AF Mute' },
					],
				},
			],
			callback: (feedback) => {
				const channel = Number(feedback.options.receiver)
				const setting = Number(feedback.options.setting)
				switch (setting as MuteOptions) {
					case MuteOptions.off:
						return self.receiver.channels[channel].mate.muteConfig == MuteOptions.off
					case MuteOptions.af_mute:
						return self.receiver.channels[channel].mate.muteConfig == MuteOptions.af_mute
					case MuteOptions.rf_mute:
						return self.receiver.channels[channel].mate.muteConfig == MuteOptions.rf_mute
				}
			},
		},
		tx_mute_config_table: {
			name: 'RX: Mute Config [Table Stand]',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
				{
					id: 'setting',
					type: 'dropdown',
					label: 'Mute Setting',
					default: MuteOptionsTable.off,
					choices: [
						{ id: MuteOptionsTable.off, label: 'Off' },
						{ id: MuteOptionsTable.af_mute, label: 'AF Mute' },
						{ id: MuteOptionsTable.push_to_talk, label: 'Push To Talk' },
						{ id: MuteOptionsTable.push_to_mute, label: 'Push To Mute' },
					],
				},
			],
			callback: (feedback) => {
				const channel = Number(feedback.options.receiver)
				const setting = Number(feedback.options.setting)
				switch (setting as MuteOptionsTable) {
					case MuteOptionsTable.off:
						return self.receiver.channels[channel].mate.muteConfig == MuteOptionsTable.off
					case MuteOptionsTable.af_mute:
						return self.receiver.channels[channel].mate.muteConfig == MuteOptionsTable.af_mute
					case MuteOptionsTable.push_to_talk:
						return self.receiver.channels[channel].mate.muteConfig == MuteOptionsTable.push_to_talk
					case MuteOptionsTable.push_to_mute:
						return self.receiver.channels[channel].mate.muteConfig == MuteOptionsTable.push_to_mute
				}
			},
		},
		rx_sync_ignore: {
			name: 'RX: Sync Ignore',
			description: 'Get feedback over currently ignored sync parameters of a receiver channel',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
				{
					id: 'setting',
					type: 'dropdown',
					label: 'Setting',
					default: SyncSettings.trim_ignore,
					choices: [
						{ id: SyncSettings.trim_ignore, label: 'Trim' },
						{ id: SyncSettings.name_ignore, label: 'Name' },
						{ id: SyncSettings.mute_config_ignore, label: 'Mute Mute' },
						{ id: SyncSettings.lowcut_ignore, label: 'Lowcut' },
						{ id: SyncSettings.lock_ignore, label: 'Auto Lock' },
						{ id: SyncSettings.led_ignore, label: 'LED' },
						{ id: SyncSettings.frequency_ignore, label: 'Frequency' },
						{ id: SyncSettings.cable_emulation_ignore, label: 'Cable Emulation' },
					],
				},
			],
			callback: (feedback) => {
				const channel = Number(feedback.options.receiver)
				const setting = Number(feedback.options.setting)
				switch (setting as SyncSettings) {
					case SyncSettings.trim_ignore:
						return self.receiver.channels[channel].syncIgnoreTrim
					case SyncSettings.name_ignore:
						return self.receiver.channels[channel].syncIgnoreName
					case SyncSettings.mute_config_ignore:
						return self.receiver.channels[channel].syncIgnoreMuteConfig
					case SyncSettings.lowcut_ignore:
						return self.receiver.channels[channel].syncIgnoreLowcut
					case SyncSettings.lock_ignore:
						return self.receiver.channels[channel].syncIgnoreLock
					case SyncSettings.led_ignore:
						return self.receiver.channels[channel].syncIgnoreLED
					case SyncSettings.frequency_ignore:
						return self.receiver.channels[channel].syncIgnoreFrequency
					case SyncSettings.cable_emulation_ignore:
						return self.receiver.channels[channel].syncIgnoreCableEmulation
					default:
						return false
				}
			},
		},
		receiverState: {
			name: 'RX: Status Display',
			description: 'Displays detailed information about the selected receiver channel',
			type: 'advanced',
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
			],
			callback: async (feedback) => {
				const channel = Number(feedback.options.receiver)

				if (feedback.image) {
					const cornerOptionsLeft: OptionsCorner = {
						width: feedback.image.width,
						height: feedback.image.height,
						color: combineRgb(0, 255, 0),
						size: 15,
						location: 'topLeft',
						opacity: 255,
					}
					const cornerOptionsRight: OptionsCorner = {
						width: feedback.image.width,
						height: feedback.image.height,
						color: combineRgb(0, 255, 0),
						size: 15,
						location: 'topRight',
						opacity: 255,
					}
					const batterySymbolRed: OptionsRect = {
						width: feedback.image.width,
						height: feedback.image.height,
						color: combineRgb(255, 255, 255),
						rectWidth: 30,
						rectHeight: 13,
						strokeWidth: 1,
						opacity: 255,
						fillColor: combineRgb(255, 0, 0),
						fillOpacity: 128,
						offsetX: 20,
						offsetY: 4,
					}
					const batterySymbolYellow: OptionsRect = {
						width: feedback.image.width,
						height: feedback.image.height,
						color: combineRgb(255, 255, 255),
						rectWidth: 30,
						rectHeight: 13,
						strokeWidth: 1,
						opacity: 255,
						fillColor: combineRgb(255, 255, 0),
						fillOpacity: 128,
						offsetX: 20,
						offsetY: 4,
					}
					const batterySymbolGreen: OptionsRect = {
						width: feedback.image.width,
						height: feedback.image.height,
						color: combineRgb(255, 255, 255),
						rectWidth: 30,
						rectHeight: 13,
						strokeWidth: 1,
						opacity: 255,
						fillColor: combineRgb(0, 255, 0),
						fillOpacity: 128,
						offsetX: 20,
						offsetY: 4,
					}
					const batteryOptions2: OptionsRect = {
						width: feedback.image.width,
						height: feedback.image.height,
						color: combineRgb(255, 255, 255),
						rectWidth: 3,
						rectHeight: 4,
						strokeWidth: 1,
						opacity: 255,
						fillColor: combineRgb(255, 255, 255),
						fillOpacity: 255,
						offsetX: 50,
						offsetY: 8,
					}

					const elements: Uint8Array[] = []

					if (self.receiver.channels[channel].activeAntenna == 1) {
						elements.push(graphics.corner(cornerOptionsLeft))
					} else if (self.receiver.channels[channel].activeAntenna == 2) {
						elements.push(graphics.corner(cornerOptionsRight))
					}

					if (self.receiver.channels[channel].mate.batteryGauge > 50) {
						elements.push(graphics.rect(batterySymbolGreen))
					} else if (self.receiver.channels[channel].mate.batteryGauge >= 20) {
						elements.push(graphics.rect(batterySymbolYellow))
					} else {
						elements.push(graphics.rect(batterySymbolRed))
					}
					elements.push(graphics.rect(batteryOptions2))

					const commonIconProps: OptionsIcon = {
						width: feedback.image.width,
						height: feedback.image.height,
						type: 'custom',
					}

					const antennaProps: OptionsIcon = {
						...commonIconProps,
						offsetX: 2,
						offsetY: 53,
						customWidth: 16,
						customHeight: 16,
					}

					const afPeakProps: OptionsIcon = {
						...commonIconProps,
						offsetX: feedback.image.width - 2 - 16,
						offsetY: 15,
						customWidth: 16,
						customHeight: 16,
					}

					const shieldProps: OptionsIcon = {
						...commonIconProps,
						offsetX: feedback.image.width - 2 - 16,
						offsetY: 53,
						customWidth: 16,
						customHeight: 16,
					}

					const muteProps: OptionsIcon = {
						...commonIconProps,
						offsetX: 2,
						offsetY: 34,
						customWidth: 16,
						customHeight: 16,
					}

					const warningProps: OptionsIcon = {
						...commonIconProps,
						offsetX: feedback.image.width - 2 - 16,
						offsetY: 34,
						customWidth: 16,
						customHeight: 16,
					}

					const identBarProps: OptionsBar = {
						width: feedback.image.width,
						height: feedback.image.height,
						colors: [
							{ size: 100, color: combineRgb(0, 255, 0), background: combineRgb(0, 255, 0), backgroundOpacity: 255 },
						],
						barLength: feedback.image.width,
						barWidth: 2,
						value: 100,
						type: 'horizontal',
						offsetX: 0,
						offsetY: feedback.image.height - 2,
						opacity: 255,
					}

					if (self.receiver.channels[channel].hasAfPeakWarning == true) {
						elements.push(
							graphics.icon({
								...afPeakProps,
								custom: images.afpeak,
							}),
						)
					}

					if (self.receiver.channels[channel].identification) {
						elements.push(graphics.bar(identBarProps))
					}

					if (self.receiver.channels[channel].warnings) {
						elements.push(
							graphics.icon({
								...warningProps,
								custom: images.warning,
							}),
						)
					}

					if (self.receiver.channels[channel].hasAes256Error) {
						elements.push(
							graphics.icon({
								...shieldProps,
								custom: images.shield.red,
							}),
						)
					} else {
						if (self.receiver.encryption) {
							elements.push(
								graphics.icon({
									...shieldProps,
									custom: images.shield.green,
								}),
							)
						} else {
							elements.push(
								graphics.icon({
									...shieldProps,
									custom: images.shield.gray,
								}),
							)
						}
					}

					if (self.receiver.channels[channel].rsqi > 70) {
						elements.push(
							graphics.icon({
								...antennaProps,
								custom: images.antenna.green,
							}),
						)
					} else if (self.receiver.channels[channel].rsqi > 40) {
						elements.push(
							graphics.icon({
								...antennaProps,
								custom: images.antenna.yellow,
							}),
						)
					} else if (self.receiver.channels[channel].rsqi >= 1) {
						elements.push(
							graphics.icon({
								...antennaProps,
								custom: images.antenna.red,
							}),
						)
					} else {
						elements.push(
							graphics.icon({
								...antennaProps,
								custom: images.antenna.gray,
							}),
						)
					}
					if (self.receiver.channels[channel].mate.muted) {
						elements.push(
							graphics.icon({
								...muteProps,
								custom: images.mute,
							}),
						)
					}

					return {
						imageBuffer: graphics.stackImage(elements),
						text:
							self.receiver.channels[channel].mate.batteryGauge +
							'%\\n\\n' +
							self.receiver.channels[channel].name +
							'\\n' +
							self.receiver.channels[channel].frequency.toString().slice(0, 3) +
							'.' +
							self.receiver.channels[channel].frequency.toString().slice(3) +
							'\\n\\n' +
							self.receiver.channels[channel].rsqi +
							'%',
					}
				} else
					return {
						imageBuffer: new Uint8Array(),
					}
			},
		},
	}
	/* Dante model specific feedbacks  */

	if (self.receiver.model === ReceiverModel.EM4 || self.receiver.model === ReceiverModel.EM2_DANTE) {
		feedbacks.dante_port_mapping = {
			name: 'Dante: Port Mapping',
			description: 'Becomes active if the selected port mapping is currently being used on the Dante interface',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [
				{
					id: 'mapping',
					type: 'dropdown',
					label: 'Mapping',
					default: 0,
					choices: [
						{ id: DantePortMapping.SINGLE_CABLE, label: 'Single Cable' },
						{ id: DantePortMapping.SPLIT1, label: 'Split 1' },
						{ id: DantePortMapping.SPLIT2, label: 'Split 2' },
						{ id: DantePortMapping.SPLIT, label: 'Split' },
						{ id: DantePortMapping.AUDIO_REDUNDANCY, label: 'Audio Redundancy' },
					],
				},
			],
			callback: () => {
				return false
				//ToDo: Implement callback
			},
		}
	}
	self.setFeedbackDefinitions(feedbacks)
}
