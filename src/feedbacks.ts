import type { ModuleInstance } from './main.js'
import { graphics } from 'companion-module-utils'
import { DantePortMapping, MuteOptions, MuteOptionsTable, SyncSettings, EWDXReceiver } from './ewdxReceiver.js'
import { drawIcon, images, type IconOptions } from './graphics.js'

import { DeviceModel } from './ewdx.js'
import { ChargingBayState, ChargingBayWarnings, ChargingDevice, CHG70N } from './chg70n.js'
import { combineRgb, CompanionFeedbackDefinitions } from '@companion-module/base'

/**
 * Narrows a numeric option value to a member of the given enum.
 *
 * Feedback options arrive as plain numbers, so switching over them directly compares a number
 * against enum members and leaves the switch non exhaustive. Narrowing first keeps the comparison
 * within one enum type, and lets TypeScript check that every member of it is handled.
 *
 * @param enumObject - The enum the value is expected to belong to
 * @param value - The option value to check
 * @returns Whether the value is a member of the enum
 */
function isEnumValue<T extends Record<string, unknown>>(enumObject: T, value: number): value is T[keyof T] & number {
	return Object.values(enumObject).includes(value)
}

export function UpdateFeedbacks(self: ModuleInstance): void {
	function getChannelOptions(): { id: number; label: string }[] {
		const maxChannels = self.device.model === DeviceModel.EM4 ? 4 : 2
		return Array.from({ length: maxChannels }, (_, i) => ({
			id: i,
			label: `Channel ${i + 1}`,
		}))
	}

	const feedbacks: CompanionFeedbackDefinitions = {}

	feedbacks.deviceIdentification = {
		name: 'Device: Identification',
		description: 'Becomes active if the selected device is currently being identified (LED blinks)',
		type: 'boolean',
		defaultStyle: {
			bgcolor: combineRgb(0, 255, 0),
		},
		options: [],
		callback: () => {
			return self.device.identification
		},
	}

	if (self.device instanceof EWDXReceiver) {
		const receiver: EWDXReceiver = self.device
		feedbacks.ActiveAntenna = {
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

				return receiver.channels[channel].activeAntenna == feedback.options.antenna
			},
		}
		feedbacks.device_encryption = {
			name: 'Device: Encryption',
			description: 'Becomes active if encryption is enabled on the receiver',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [],
			callback: () => {
				return receiver.encryption
			},
		}
		feedbacks.device_link_density_mode = {
			name: 'Device: Link Density Mode',
			description: 'Becomes active if the Link Density mode is enabled on the receiver',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [],
			callback: () => {
				return receiver.linkDensityMode
			},
		}
		feedbacks.tx_muted = {
			name: 'TX: Muted',
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
				return receiver.channels[channel].mate.muted
			},
		}
		feedbacks.rx_encryption_error = {
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
				return receiver.channels[channel].hasAes256Error
			},
		}
		feedbacks.rx_af_peak_warning = {
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
				return receiver.channels[channel].hasAfPeakWarning
			},
		}
		feedbacks.rx_identification = {
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
				return receiver.channels[channel].identification
			},
		}

		feedbacks.tx_mute_config_sk = {
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
				if (!isEnumValue(MuteOptions, setting)) return false
				switch (setting) {
					case MuteOptions.off:
						return receiver.channels[channel].mate.muteConfig == MuteOptions.off
					case MuteOptions.af_mute:
						return receiver.channels[channel].mate.muteConfig == MuteOptions.af_mute
					case MuteOptions.rf_mute:
						return receiver.channels[channel].mate.muteConfig == MuteOptions.rf_mute
				}
			},
		}
		feedbacks.tx_mute_config_table = {
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
				if (!isEnumValue(MuteOptionsTable, setting)) return false
				switch (setting) {
					case MuteOptionsTable.off:
						return receiver.channels[channel].mate.muteConfig == MuteOptionsTable.off
					case MuteOptionsTable.af_mute:
						return receiver.channels[channel].mate.muteConfig == MuteOptionsTable.af_mute
					case MuteOptionsTable.push_to_talk:
						return receiver.channels[channel].mate.muteConfig == MuteOptionsTable.push_to_talk
					case MuteOptionsTable.push_to_mute:
						return receiver.channels[channel].mate.muteConfig == MuteOptionsTable.push_to_mute
				}
			},
		}
		feedbacks.rx_sync_ignore = {
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
				if (!isEnumValue(SyncSettings, setting)) return false
				switch (setting) {
					case SyncSettings.trim_ignore:
						return receiver.channels[channel].syncIgnoreTrim
					case SyncSettings.name_ignore:
						return receiver.channels[channel].syncIgnoreName
					case SyncSettings.mute_config_ignore:
						return receiver.channels[channel].syncIgnoreMuteConfig
					case SyncSettings.lowcut_ignore:
						return receiver.channels[channel].syncIgnoreLowcut
					case SyncSettings.lock_ignore:
						return receiver.channels[channel].syncIgnoreLock
					case SyncSettings.led_ignore:
						return receiver.channels[channel].syncIgnoreLED
					case SyncSettings.frequency_ignore:
						return receiver.channels[channel].syncIgnoreFrequency
					case SyncSettings.cable_emulation_ignore:
						return receiver.channels[channel].syncIgnoreCableEmulation
				}
			},
		}
		feedbacks.receiverState = {
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
					const commonIconProps: Pick<IconOptions, 'width' | 'height'> = {
						width: feedback.image.width,
						height: feedback.image.height,
					}
					// Icon rows are derived from the canvas size rather than assuming a 72x72 button:
					// with a topbar the feedback only gets a 72x58 canvas to draw on
					const iconSize = 16
					const bottomRow = Math.max(0, feedback.image.height - iconSize - 3)
					const topRow = Math.max(0, Math.min(15, bottomRow - 2 * iconSize))
					const middleRow = Math.round((topRow + bottomRow) / 2)
					if (self.device.deviceConnected) {
						const cornerOptionsLeft: graphics.OptionsCorner = {
							width: feedback.image.width,
							height: feedback.image.height,
							color: combineRgb(0, 255, 0),
							size: 15,
							location: 'topLeft',
							opacity: 255,
						}
						const cornerOptionsRight: graphics.OptionsCorner = {
							width: feedback.image.width,
							height: feedback.image.height,
							color: combineRgb(0, 255, 0),
							size: 15,
							location: 'topRight',
							opacity: 255,
						}
						const batterySymbolRed: graphics.OptionsRect = {
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
						const batterySymbolYellow: graphics.OptionsRect = {
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
						const batterySymbolGreen: graphics.OptionsRect = {
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
						const batteryOptions2: graphics.OptionsRect = {
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

						if (receiver.channels[channel].activeAntenna == 1) {
							elements.push(graphics.corner(cornerOptionsLeft))
						} else if (receiver.channels[channel].activeAntenna == 2) {
							elements.push(graphics.corner(cornerOptionsRight))
						}

						if (receiver.channels[channel].mate.batteryGauge > 50) {
							elements.push(graphics.rect(batterySymbolGreen))
						} else if (receiver.channels[channel].mate.batteryGauge >= 20) {
							elements.push(graphics.rect(batterySymbolYellow))
						} else {
							elements.push(graphics.rect(batterySymbolRed))
						}
						elements.push(graphics.rect(batteryOptions2))

						const antennaProps: Omit<IconOptions, 'custom'> = {
							...commonIconProps,
							offsetX: 2,
							offsetY: bottomRow,
							customWidth: iconSize,
							customHeight: iconSize,
						}

						const afPeakProps: Omit<IconOptions, 'custom'> = {
							...commonIconProps,
							offsetX: feedback.image.width - 2 - iconSize,
							offsetY: topRow,
							customWidth: iconSize,
							customHeight: iconSize,
						}

						const shieldProps: Omit<IconOptions, 'custom'> = {
							...commonIconProps,
							offsetX: feedback.image.width - 2 - iconSize,
							offsetY: bottomRow,
							customWidth: iconSize,
							customHeight: iconSize,
						}

						const muteProps: Omit<IconOptions, 'custom'> = {
							...commonIconProps,
							offsetX: 2,
							offsetY: middleRow,
							customWidth: iconSize,
							customHeight: iconSize,
						}

						const warningProps: Omit<IconOptions, 'custom'> = {
							...commonIconProps,
							offsetX: feedback.image.width - 2 - iconSize,
							offsetY: middleRow,
							customWidth: iconSize,
							customHeight: iconSize,
						}

						const identBarProps: graphics.OptionsBar = {
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

						if (receiver.channels[channel].hasAfPeakWarning == true) {
							elements.push(
								drawIcon({
									...afPeakProps,
									custom: images.afpeak,
								}),
							)
						}

						if (receiver.channels[channel].identification) {
							elements.push(graphics.bar(identBarProps))
						}

						if (receiver.channels[channel].warnings) {
							elements.push(
								drawIcon({
									...warningProps,
									custom: images.warning,
								}),
							)
						}

						if (receiver.channels[channel].hasAes256Error) {
							elements.push(
								drawIcon({
									...shieldProps,
									custom: images.shield.red,
								}),
							)
						} else {
							if (receiver.encryption) {
								elements.push(
									drawIcon({
										...shieldProps,
										custom: images.shield.green,
									}),
								)
							} else {
								elements.push(
									drawIcon({
										...shieldProps,
										custom: images.shield.gray,
									}),
								)
							}
						}

						if (receiver.channels[channel].rsqi > 70) {
							elements.push(
								drawIcon({
									...antennaProps,
									custom: images.antenna.green,
								}),
							)
						} else if (receiver.channels[channel].rsqi > 40) {
							elements.push(
								drawIcon({
									...antennaProps,
									custom: images.antenna.yellow,
								}),
							)
						} else if (receiver.channels[channel].rsqi >= 1) {
							elements.push(
								drawIcon({
									...antennaProps,
									custom: images.antenna.red,
								}),
							)
						} else {
							elements.push(
								drawIcon({
									...antennaProps,
									custom: images.antenna.gray,
								}),
							)
						}
						if (receiver.channels[channel].mate.muted) {
							elements.push(
								drawIcon({
									...muteProps,
									custom: images.mute,
								}),
							)
						}

						let batteryInfo

						if (
							receiver.channels[channel].mate.batteryType === 'Battery' &&
							receiver.channels[channel].mate.batteryLifetime != 0
						) {
							const minutes = receiver.channels[channel].mate.batteryLifetime
							const hours = Math.floor(minutes / 60)
							const remainingMinutes = minutes % 60
							batteryInfo = `${hours}:${remainingMinutes}h`
						} else {
							batteryInfo = `${receiver.channels[channel].mate.batteryGauge}%`
						}

						return {
							imageBuffer: graphics.stackImage(elements),
							text:
								batteryInfo +
								'\\n\\n' +
								receiver.channels[channel].name +
								'\\n' +
								receiver.channels[channel].frequency.toString().slice(0, 3) +
								'.' +
								receiver.channels[channel].frequency.toString().slice(3) +
								'\\n\\n' +
								receiver.channels[channel].rsqi +
								'%',
						}
					} else {
						const warningProps: Omit<IconOptions, 'custom'> = {
							...commonIconProps,
							offsetX: Math.floor(feedback.image.width / 2) - 8,
							offsetY: 8,
							customWidth: iconSize,
							customHeight: iconSize,
						}

						return {
							imageBuffer: drawIcon({
								...warningProps,
								custom: images.disconnected,
							}),
							text: '\\nReceiver not connected',
						}
					}
				} else {
					return {
						imageBuffer: new Uint8Array(),
					}
				}
			},
		}
		/* Dante model specific feedbacks  */
		if (self.device.model === DeviceModel.EM4 || self.device.model === DeviceModel.EM2_DANTE) {
			if (self.device.model === DeviceModel.EM4 || self.device.model === DeviceModel.EM2_DANTE) {
				feedbacks.dante_port_mapping = {
					name: 'Dante: Port Mapping',
					description: 'Becomes active if the selected port mapping is currently being used on the device',
					type: 'boolean',
					defaultStyle: {
						bgcolor: combineRgb(0, 255, 0),
					},
					options: [
						{
							id: 'mapping',
							type: 'dropdown',
							label: 'Mapping',
							default: DantePortMapping.SINGLE_CABLE,
							choices: [
								{ id: DantePortMapping.SINGLE_CABLE, label: 'Single Cable' },
								{ id: DantePortMapping.SPLIT1, label: 'Split 1' },
								{ id: DantePortMapping.SPLIT2, label: 'Split 2' },
								{ id: DantePortMapping.SPLIT, label: 'Split' },
								{ id: DantePortMapping.AUDIO_REDUNDANCY, label: 'Audio Redundancy' },
							],
						},
					],
					callback: (feedback) => {
						const mapping = feedback.options.mapping as DantePortMapping

						return receiver.danteInterfaceMapping === mapping
					},
				}
			}
		}
		/* CHG70N Feedbacks */
	} else if (self.device instanceof CHG70N) {
		const device: CHG70N = self.device
		feedbacks.baystate = {
			name: 'Charging Bay: Status Display',
			description: 'Shows important information about the selected charging bay',
			type: 'advanced',
			options: [
				{
					id: 'bay',
					type: 'dropdown',
					label: 'Charging Bay',
					default: 0,
					choices: [
						{ id: 0, label: 'Bay 1' },
						{ id: 1, label: 'Bay 2' },
					],
				},
			],
			callback: async (feedback) => {
				const bay = Number(feedback.options.bay)
				if (feedback.image) {
					const commonIconProps: Pick<IconOptions, 'width' | 'height'> = {
						width: feedback.image.width,
						height: feedback.image.height,
					}
					// Keep the icon row on the canvas when a topbar reduces its height
					const iconRow = Math.min(37, Math.max(0, feedback.image.height - 16 - 3))
					if (self.device.deviceConnected) {
						const elements: Uint8Array[] = []

						const batterySymbolRed: graphics.OptionsRect = {
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
						const batterySymbolYellow: graphics.OptionsRect = {
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
						const batterySymbolGreen: graphics.OptionsRect = {
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
						const batteryOptions2: graphics.OptionsRect = {
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

						const warningProps: Omit<IconOptions, 'custom'> = {
							...commonIconProps,
							offsetX: feedback.image.width - 2 - 16,
							offsetY: 3,
							customWidth: 16,
							customHeight: 16,
						}

						const overcurrentProps: Omit<IconOptions, 'custom'> = {
							...commonIconProps,
							offsetX: 2,
							offsetY: iconRow,
							customWidth: 16,
							customHeight: 16,
						}

						const temperatureProps: Omit<IconOptions, 'custom'> = {
							...commonIconProps,
							offsetX: 19,
							offsetY: iconRow,
							customWidth: 16,
							customHeight: 16,
						}

						const communicationErrorProps: Omit<IconOptions, 'custom'> = {
							...commonIconProps,
							offsetX: 36,
							offsetY: iconRow,
							customWidth: 16,
							customHeight: 16,
						}

						const chargeErrorProps: Omit<IconOptions, 'custom'> = {
							...commonIconProps,
							offsetX: 55,
							offsetY: iconRow,
							customWidth: 16,
							customHeight: 16,
						}

						const okCircleProps: graphics.OptionsCircle = {
							radius: 6,
							color: combineRgb(0, 255, 0),
							opacity: 255,
						}

						const errorCircleProps: graphics.OptionsCircle = {
							radius: 6,
							color: combineRgb(255, 0, 0),
							opacity: 255,
						}

						const identBarProps: graphics.OptionsBar = {
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

						if (device.chargingBays[bay].state == ChargingBayState.NORMAL) {
							const circle = graphics.circle(okCircleProps)
							elements.push(
								drawIcon({
									width: feedback.image.width,
									height: feedback.image.height,
									custom: circle,
									customHeight: 12,
									customWidth: 12,
									offsetX: 5,
									offsetY: 4,
								}),
							)
						} else {
							const circle = graphics.circle(errorCircleProps)
							elements.push(
								drawIcon({
									width: feedback.image.width,
									height: feedback.image.height,
									custom: circle,
									customHeight: 12,
									customWidth: 12,
									offsetX: 5,
									offsetY: 4,
								}),
							)
						}

						if (device.chargingBays[bay].syncError) {
							elements.push(
								drawIcon({
									...warningProps,
									custom: images.warning,
								}),
							)
						}

						if (device.chargingBays[bay].warnings.includes(ChargingBayWarnings.BatteryTempOutOfRange)) {
							elements.push(
								drawIcon({
									...temperatureProps,
									custom: images.temperature,
								}),
							)
						}

						if (device.chargingBays[bay].warnings.includes(ChargingBayWarnings.OvercurrentDetected)) {
							elements.push(
								drawIcon({
									...overcurrentProps,
									custom: images.overcurrent,
								}),
							)
						}

						if (device.chargingBays[bay].warnings.includes(ChargingBayWarnings.BatteryComError)) {
							elements.push(
								drawIcon({
									...communicationErrorProps,
									custom: images.communicationError,
								}),
							)
						}

						if (
							device.chargingBays[bay].warnings.includes(ChargingBayWarnings.BatteryNotChargeable) ||
							device.chargingBays[bay].warnings.includes(ChargingBayWarnings.BatteryNotDischargeable)
						) {
							elements.push(
								drawIcon({
									...chargeErrorProps,
									custom: images.chargeError,
								}),
							)
						}

						if (device.chargingBays[bay].identification) {
							elements.push(graphics.bar(identBarProps))
						}

						if (device.chargingBays[bay].batGauge > 60) {
							elements.push(graphics.rect(batterySymbolGreen))
						} else if (device.chargingBays[bay].batGauge > 20) {
							elements.push(graphics.rect(batterySymbolYellow))
						} else {
							elements.push(graphics.rect(batterySymbolRed))
						}
						elements.push(graphics.rect(batteryOptions2))

						return {
							imageBuffer: graphics.stackImage(elements),
							text:
								device.chargingBays[bay].batGauge +
								'%\\n\\nFull: ' +
								device.chargingBays[bay].timeToFull +
								' min\\n\\n\\n' +
								ChargingDevice[device.chargingBays[bay].chargingDevice],
						}
					} else {
						const warningProps: Omit<IconOptions, 'custom'> = {
							...commonIconProps,
							offsetX: Math.floor(feedback.image.width / 2) - 8,
							offsetY: 2,
							customWidth: 16,
							customHeight: 16,
						}

						return {
							imageBuffer: drawIcon({
								...warningProps,
								custom: images.disconnected,
							}),
							text: '\\nCharger not connected',
						}
					}
				} else {
					return {
						imageBuffer: new Uint8Array(),
					}
				}
			},
		}
		feedbacks.deviceIdentification = {
			name: 'Device: Identification',
			description: 'Becomes active, if the device is currently being identified',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [],
			callback: () => {
				return device.identification
			},
		}
		feedbacks.bayIdentification = {
			name: 'Charging Bay: Identification',
			description: 'Becomes active, if a specific charging bay is currently being identified',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
			},
			options: [
				{
					id: 'bay',
					type: 'dropdown',
					label: 'Charging Bay',
					default: 0,
					choices: [
						{ id: 0, label: 'Bay 1' },
						{ id: 1, label: 'Bay 2' },
					],
				},
			],
			callback: (feedback) => {
				const bay = Number(feedback.options.bay)
				return device.chargingBays[bay].identification
			},
		}
		feedbacks.bayWarnings = {
			name: 'Charging Bay: Warnings',
			description: 'Becomes active, if a specific warning is present in the selected charging bay',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
			},
			options: [
				{
					id: 'bay',
					type: 'dropdown',
					label: 'Charging Bay',
					default: 0,
					choices: [
						{ id: 0, label: 'Bay 1' },
						{ id: 1, label: 'Bay 2' },
					],
				},
				{
					id: 'warning',
					type: 'dropdown',
					label: 'Warning',
					default: ChargingBayWarnings.OvercurrentDetected,
					choices: [
						{ id: ChargingBayWarnings.BatteryComError, label: 'Battery Communication Error' },
						{ id: ChargingBayWarnings.BatteryNotChargeable, label: 'Battery not chargeable' },
						{ id: ChargingBayWarnings.BatteryNotDischargeable, label: 'Battery not dischargeable' },
						{ id: ChargingBayWarnings.BatteryTempOutOfRange, label: 'Battery temperature out of range' },
						{ id: ChargingBayWarnings.OvercurrentDetected, label: 'Overcurrent detected' },
					],
				},
			],
			callback: (feedback) => {
				const bay = Number(feedback.options.bay)
				const warning = feedback.options.warning as ChargingBayWarnings
				return device.chargingBays[bay].warnings.includes(warning)
			},
		}
	}

	self.setFeedbackDefinitions(feedbacks)
}
