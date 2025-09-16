import { CompanionActionDefinitions, Regex } from '@companion-module/base'
import type { ModuleInstance } from './main.js'
import {
	CableEmulationOptions,
	DantePortMapping,
	LowcutOptions,
	MuteOptions,
	MuteOptionsTable,
	SyncSettings,
	EWDXReceiver,
} from './ewdxReceiver.js'
import { EWDXReceiverSCPv2 } from './ewdxReceiverSCPv2.js'
import { DeviceModel } from './ewdx.js'
import { CHG70N } from './chg70n.js'

export function UpdateActions(self: ModuleInstance): void {
	function getChannelOptions(): { id: number; label: string }[] {
		const maxChannels = self.device.model === DeviceModel.EM4 ? 4 : 2
		return Array.from({ length: maxChannels }, (_, i) => ({
			id: i,
			label: `Channel ${i + 1}`,
		}))
	}

	// Helper function to check if device is a receiver (SCPv1 or SCPv2)
	function isReceiver(device: any): device is EWDXReceiver | EWDXReceiverSCPv2 {
		return device instanceof EWDXReceiver || device instanceof EWDXReceiverSCPv2
	}

	// Helper function to handle async/sync method calls
	async function safeCall(methodCall: any): Promise<void> {
		try {
			const result = methodCall
			if (result && typeof result.then === 'function') {
				await result
			}
		} catch (error) {
			console.error('Action call failed:', error)
		}
	}

	const actions: CompanionActionDefinitions = {}

	actions.restart = {
		name: 'Device: Restart',
		options: [],
		callback: async () => {
			self.device.restart()
		},
	}

	actions.name = {
		name: 'Device: Set Name',
		options: [
			{
				id: 'name',
				type: 'textinput',
				label: 'Name (max. 18 Chars - no special characters or blanks)',
				default: '',
				useVariables: true,
			},
		],
		callback: async (action) => {
			const name = String(action.options.name)
			const parsedName = await self.parseVariablesInString(name)
			self.device.setName(parsedName)
		},
	}

	actions.location = {
		name: 'Device: Set Location',
		options: [
			{
				id: 'location',
				type: 'textinput',
				label: 'Location (max. 400 Chars)',
				default: '',
			},
		],
		callback: async (action) => {
			const location = String(action.options.location)
			self.device.setLocation(location)
		},
	}

	actions.networkSettings = {
		name: 'Device: Change Network Settings',
		options: [
			{
				id: 'dhcp',
				type: 'checkbox',
				label: 'DHCP',
				default: false,
			},
			{
				id: 'mdns',
				type: 'checkbox',
				label: 'MDNS',
				default: true,
			},
			{
				id: 'ip',
				type: 'textinput',
				label: 'IP Address',
				default: '192.168.0.2',
				regex: Regex.IP,
			},
			{
				id: 'netmask',
				type: 'textinput',
				label: 'Netmask',
				default: '255.255.255.0',
				regex: Regex.IP,
			},
			{
				id: 'gateway',
				type: 'textinput',
				label: 'Gateway',
				default: '192.168.0.1',
				regex: Regex.IP,
			},
		],
		callback: async (action) => {
			const dhcp = Boolean(action.options.dhcp)
			const mdns = Boolean(action.options.mdns)
			const ip = String(action.options.ip)
			const netmask = String(action.options.netmask)
			const gateway = String(action.options.gateway)
			self.device.setNetworkSettings(dhcp, mdns, ip, netmask, gateway)
		},
	}

	if (isReceiver(self.device)) {
		const receiver: EWDXReceiver | EWDXReceiverSCPv2 = self.device
		actions.brightness = {
			name: 'Device: Set Brightness',
			options: [
				{
					id: 'brightness',
					type: 'number',
					label: 'Brightness',
					default: 3,
					min: 1,
					max: 5,
				},
			],
			callback: async (action) => {
				const brightness = Number(action.options.brightness)
				receiver.setBrightness(brightness)
			},
		}
		actions.identification = {
			name: 'Device: Enable/Disable Identification',
			options: [
				{
					id: 'ident',
					type: 'checkbox',
					label: 'Visual Identification',
					default: true,
				},
			],
			callback: async (action) => {
				const ident = Boolean(action.options.ident)
				receiver.setIdentification(ident)
			},
		}
		actions.autolock = {
			name: 'Device: Set Auto Lock',
			options: [
				{
					id: 'lock',
					type: 'checkbox',
					label: 'Auto Lock',
					default: true,
				},
			],
			callback: async (action) => {
				const lock = Boolean(action.options.lock)
				if (receiver instanceof EWDXReceiver) {
					receiver.setAutoLock(lock)
				} else if (receiver instanceof EWDXReceiverSCPv2) {
					await receiver.setAutoLockAllChannels(lock)
				}
			},
		}
		actions.encryption = {
			name: 'Device: Set Encryption',
			options: [
				{
					id: 'encryption',
					type: 'checkbox',
					label: 'Encryption',
					default: true,
				},
			],
			callback: async (action) => {
				const encryption = Boolean(action.options.encryption)
				await safeCall(receiver.setEncryption(encryption))
			},
		}

		actions.link_density = {
			name: 'Device: Set Link Density Mode',
			options: [
				{
					id: 'linkdensity',
					type: 'checkbox',
					label: 'Link Density Mode',
					default: false,
				},
			],
			callback: async (action) => {
				const linkdensity = Boolean(action.options.linkdensity)
				await safeCall(receiver.setLinkDensityMode(linkdensity))
			},
		}
		actions.rx_mute = {
			name: 'RX: Set Mute',
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
				{
					id: 'mute',
					type: 'dropdown',
					label: 'Mute',
					default: 'mute',
					choices: [
						{ id: 'mute', label: 'Mute' },
						{ id: 'unmute', label: 'Unmute' },
						{ id: 'toggle', label: 'Toggle' },
					],
				},
			],
			callback: async (action) => {
				const channel = Number(action.options.receiver)
				const mute = String(action.options.mute)
				switch (mute) {
					case 'mute':
						await safeCall(receiver.channels[channel].setMuteState(true))
						break
					case 'unmute':
						await safeCall(receiver.channels[channel].setMuteState(false))
						break
					case 'toggle':
						await safeCall(receiver.channels[channel].toggleMuteState())
						break
				}
			},
		}
		actions.rx_ss_mute_config_sk = {
			name: 'RX: Sync Settings: Mute Config [SK(M)]',
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
			callback: async (action) => {
				const channel = Number(action.options.receiver)
				const muteSetting = Number(action.options.setting)
				await safeCall(receiver.channels[channel].setMuteConfigSK(muteSetting as MuteOptions))
			},
		}
		actions.rx_ss_mute_config_table = {
			name: 'RX: Sync Settings: Mute Config [Table Stand]',
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
			callback: async (action) => {
				const channel = Number(action.options.receiver)
				const muteSetting = Number(action.options.setting)
				await safeCall(receiver.channels[channel].setMuteConfigTable(muteSetting as MuteOptionsTable))
			},
		}
		actions.rx_ss_ignore = {
			name: 'RX: Sync Settings: Ignore Parameters',
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
				{
					id: 'ignore',
					type: 'checkbox',
					label: 'Ignore Setting during Sync',
					default: true,
				},
			],
			callback: async (action) => {
				const channel = Number(action.options.receiver)
				const setting = Number(action.options.setting)
				const ignore = Boolean(action.options.ignore)
				await safeCall(receiver.channels[channel].setSyncIgnore(setting as SyncSettings, ignore))
			},
		}
		actions.rx_ss_lowcut = {
			name: 'RX: Sync Settings: Set Lowcut',
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
				{
					id: 'lowcut',
					type: 'dropdown',
					label: 'Lowcut',
					default: LowcutOptions.off,
					choices: Object.entries(LowcutOptions)
						.filter(([key]) => isNaN(Number(key)))
						.map(([key, value]) => ({
							id: value,
							label: key,
						})),
				},
			],
			callback: async (action) => {
				const channel = Number(action.options.receiver)
				const lowcut = Number(action.options.lowcut)
				await safeCall(receiver.channels[channel].setLowcut(lowcut as LowcutOptions))
			},
		}
		actions.rx_ss_lock = {
			name: 'RX: Sync Settings: Set Auto Lock',
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
				{
					id: 'lock',
					type: 'checkbox',
					label: 'Enable Auto Lock',
					default: true,
				},
			],
			callback: async (action) => {
				const channel = Number(action.options.receiver)
				const lock = Boolean(action.options.lock)
				await safeCall(receiver.channels[channel].setAutoLock(lock))
			},
		}
		actions.rx_ss_trim = {
			name: 'RX: Sync Settings: Set Trim',
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
				{
					id: 'trim',
					type: 'number',
					label: 'Trim',
					default: 0,
					min: -12,
					max: 6,
				},
			],
			callback: async (action) => {
				const channel = Number(action.options.receiver)
				const trim = Number(action.options.trim)
				await safeCall(receiver.channels[channel].setTrim(trim))
			},
		}
		actions.rx_ss_tx_led = {
			name: 'RX: Sync Settings: Set TX LED',
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
				{
					id: 'enabled',
					type: 'checkbox',
					label: 'Enable TX LED',
					default: true,
				},
			],
			callback: async (action) => {
				const channel = Number(action.options.receiver)
				const enabled = Boolean(action.options.enabled)
				await safeCall(receiver.channels[channel].setTXLED(enabled))
			},
		}
		actions.rx_ss_cable_emulation = {
			name: 'RX: Sync Settings: Set Cable Emulation',
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
					default: CableEmulationOptions.off,
					choices: [
						{ id: CableEmulationOptions.off, label: 'Off' },
						{ id: CableEmulationOptions.type1, label: 'Type 1' },
						{ id: CableEmulationOptions.type2, label: 'Type 2' },
						{ id: CableEmulationOptions.type3, label: 'Type 3' },
					],
				},
			],
			callback: async (action) => {
				const channel = Number(action.options.receiver)
				const setting = Number(action.options.setting)
				await safeCall(receiver.channels[channel].setCableEmulation(setting as CableEmulationOptions))
			},
		}
		actions.rx_name = {
			name: 'RX: Set Name',
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
				{
					id: 'name',
					type: 'textinput',
					label: 'Name',
					default: '',
					useVariables: true,
				},
			],
			callback: async (action) => {
				const channel = Number(action.options.receiver)
				const name = String(action.options.name)
				const parsedName = await self.parseVariablesInString(name)
				await safeCall(receiver.channels[channel].setName(parsedName))
			},
		}
		actions.rx_gain = {
			name: 'RX: Set Gain',
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
				{
					id: 'gain',
					type: 'dropdown',
					label: 'Gain Level',
					default: '0',
					choices: Array.from({ length: 16 }, (_, i) => {
						const value = -3 + i * 3
						return { id: String(value), label: `${value}dB` }
					}),
				},
			],
			callback: async (action) => {
				const channel = Number(action.options.receiver)
				const gain = Number(action.options.gain)
				await safeCall(receiver.channels[channel].setGain(gain))
			},
		}
		actions.rx_gain_relative = {
			name: 'RX: Increase/Decrease Gain',
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
				{
					id: 'direction',
					type: 'dropdown',
					label: 'Adjustment',
					default: 'increase',
					choices: [
						{ id: 'increase', label: 'Increase' },
						{ id: 'decrease', label: 'Decrease' },
					],
				},
				{
					id: 'steps',
					type: 'number',
					label: 'Steps',
					default: 1,
					min: 1,
					max: 15,
				},
			],
			callback: async (action) => {
				const channel = Number(action.options.receiver)
				const direction = String(action.options.direction)
				const steps = Number(action.options.steps)
				const availableGains = Array.from({ length: 16 }, (_, i) => -3 + i * 3)

				const currentGain = receiver.channels[channel].gain
				let index = availableGains.indexOf(currentGain)

				if (direction === 'increase') {
					index = Math.min(index + steps, availableGains.length - 1)
				} else if (direction === 'decrease') {
					index = Math.max(index - steps, 0)
				} else {
					console.error('Invalid gain adjustment')
				}

				const newGain = availableGains[index]
				await safeCall(receiver.channels[channel].setGain(newGain))
			},
		}
		actions.rx_freq = {
			name: 'RX: Set Frequency',
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
				{
					id: 'frequency',
					type: 'number',
					label: 'Frequency',
					default: 470200,
					min: 470200,
					max: 1999000,
				},
			],
			callback: async (action) => {
				const channel = Number(action.options.receiver)
				const freq = Number(action.options.frequency)
				await safeCall(receiver.channels[channel].setFrequency(freq))
			},
		}
		actions.rx_identification = {
			name: 'RX: Enable/Disable Identification',
			options: [
				{
					id: 'receiver',
					type: 'dropdown',
					label: 'Receiver Channel',
					default: 0,
					choices: getChannelOptions(),
				},
				{
					id: 'ident',
					type: 'checkbox',
					label: 'Visual Identification',
					default: true,
				},
			],
			callback: async (action) => {
				const channel = Number(action.options.receiver)
				const ident = Boolean(action.options.ident)
				await safeCall(receiver.channels[channel].setIdentification(ident))
			},
		}

		if (isReceiver(self.device)) {
			if (
				(self.device.model === DeviceModel.EM4 || self.device.model === DeviceModel.EM2_DANTE) &&
				self.device instanceof EWDXReceiver
			) {
				const receiver: EWDXReceiver = self.device
				actions.dante_network_settings = {
					name: 'Dante: Change Network Settings',
					options: [
						{
							id: 'danteInterface',
							type: 'dropdown',
							label: 'Dante Interface',
							default: 0,
							choices: [
								{ id: 0, label: 'Primary' },
								{ id: 1, label: 'Secondary' },
							],
						},
						{
							id: 'dhcp',
							type: 'checkbox',
							label: 'DHCP',
							default: false,
						},
						{
							id: 'ip',
							type: 'textinput',
							label: 'IP Address',
							default: '192.168.0.2',
							regex: Regex.IP,
						},
						{
							id: 'netmask',
							type: 'textinput',
							label: 'Netmask',
							default: '255.255.255.0',
							regex: Regex.IP,
						},
						{
							id: 'gateway',
							type: 'textinput',
							label: 'Gateway',
							default: '192.168.0.1',
							regex: Regex.IP,
						},
					],
					callback: async (action) => {
						const interfaceId = Number(action.options.danteInterface)
						const dhcp = Boolean(action.options.dhcp)
						const ip = String(action.options.ip)
						const netmask = String(action.options.netmask)
						const gateway = String(action.options.gateway)
						receiver.setDanteNetworkSettings(interfaceId, dhcp, ip, netmask, gateway)
					},
				}
				actions.dante_port_mapping = {
					name: 'Dante: Set Interface Port Mapping',
					options: [
						{
							id: 'config',
							type: 'dropdown',
							label: 'Configuration',
							default: DantePortMapping.SINGLE_CABLE,
							choices: Object.entries(DantePortMapping)
								.filter(([key]) => isNaN(Number(key)))
								.map(([key, value]) => ({
									id: value,
									label: key,
								})),
						},
					],
					callback: async (action) => {
						const setting = Number(action.options.config)
						receiver.setDantePortMapping(setting)
					},
				}
			}
		}
	} else if (self.device instanceof CHG70N) {
		const device: CHG70N = self.device

		actions.device_identification = {
			name: 'Device: Enable/Disable Identification',
			options: [
				{
					id: 'setting',
					type: 'checkbox',
					label: 'Enable Identification',
					default: true,
				},
			],
			callback: async (action) => {
				const setting = Boolean(action.options.setting)
				device.setIdentification(setting)
			},
		}

		actions.bay_identification = {
			name: 'Bay: Set Identification',
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
					id: 'setting',
					type: 'checkbox',
					label: 'Enable Identification',
					default: true,
				},
			],
			callback: async (action) => {
				const bay = Number(action.options.bay)
				const setting = Boolean(action.options.setting)
				device.chargingBays[bay].setIdentify(setting)
			},
		}

		actions.ss_mute_config = {
			name: 'Sync Settings: Mute Config',
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
			callback: async (action) => {
				const bay = Number(action.options.bay)
				const muteSetting = Number(action.options.setting)
				device.chargingBays[bay].setMuteConfig(muteSetting)
			},
		}
		actions.ss_frequency = {
			name: 'Sync Settings: Frequency',
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
					id: 'setting',
					type: 'number',
					label: 'Frequency',
					default: 470200,
					min: 470200,
					max: 1999000,
				},
			],
			callback: async (action) => {
				const bay = Number(action.options.bay)
				const setting = Number(action.options.setting)
				device.chargingBays[bay].setFrequency(setting)
			},
		}
		actions.ss_trim = {
			name: 'Sync Settings: Trim',
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
					id: 'setting',
					type: 'number',
					label: 'Trim',
					default: 0,
					min: -12,
					max: 6,
				},
			],
			callback: async (action) => {
				const bay = Number(action.options.bay)
				const setting = Number(action.options.setting)
				device.chargingBays[bay].setTrim(setting)
			},
		}

		actions.ss_name = {
			name: 'Sync Settings: Name',
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
					id: 'setting',
					type: 'textinput',
					label: 'Name',
					default: '',
				},
			],
			callback: async (action) => {
				const bay = Number(action.options.bay)
				const setting = String(action.options.setting)
				device.chargingBays[bay].setName(setting)
			},
		}

		actions.ss_lowcut = {
			name: 'Sync Settings: Set Lowcut',
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
					id: 'setting',
					type: 'dropdown',
					label: 'Lowcut',
					default: LowcutOptions.off,
					choices: Object.entries(LowcutOptions)
						.filter(([key]) => isNaN(Number(key)))
						.map(([key, value]) => ({
							id: value,
							label: key,
						})),
				},
			],
			callback: async (action) => {
				const bay = Number(action.options.bay)
				const setting = Number(action.options.setting)
				device.chargingBays[bay].setLowcut(setting as LowcutOptions)
			},
		}
		actions.ss_lock = {
			name: 'Sync Settings: Auto Lock',
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
					id: 'setting',
					type: 'checkbox',
					label: 'Enable Auto Lock',
					default: true,
				},
			],
			callback: async (action) => {
				const bay = Number(action.options.bay)
				const setting = Boolean(action.options.setting)
				device.chargingBays[bay].setAutoLock(setting)
			},
		}
		actions.ss_link_density_mode = {
			name: 'Sync Settings: Link Density Mode',
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
					id: 'setting',
					type: 'checkbox',
					label: 'Enable Link Density Mode',
					default: false,
				},
			],
			callback: async (action) => {
				const bay = Number(action.options.bay)
				const setting = Boolean(action.options.setting)
				device.chargingBays[bay].setLinkDensityMode(setting)
			},
		}
		actions.ss_tx_led = {
			name: 'Sync Settings: TX LED',
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
					id: 'setting',
					type: 'checkbox',
					label: 'Enable TX LED',
					default: true,
				},
			],
			callback: async (action) => {
				const bay = Number(action.options.bay)
				const setting = Boolean(action.options.setting)
				device.chargingBays[bay].setTxLED(setting)
			},
		}
		actions.ss_cable_emulation = {
			name: 'Sync Settings: Cable Emulation',
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
					id: 'setting',
					type: 'dropdown',
					label: 'Cable Emulation',
					default: CableEmulationOptions.off,
					choices: [
						{ id: CableEmulationOptions.off, label: 'Off' },
						{ id: CableEmulationOptions.type1, label: 'Type 1' },
						{ id: CableEmulationOptions.type2, label: 'Type 2' },
						{ id: CableEmulationOptions.type3, label: 'Type 3' },
					],
				},
			],
			callback: async (action) => {
				const bay = Number(action.options.bay)
				const setting = Number(action.options.setting)
				device.chargingBays[bay].setCableEmulation(setting)
			},
		}
	}

	self.setActionDefinitions(actions)
}
