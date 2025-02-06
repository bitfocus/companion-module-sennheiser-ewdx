import { CompanionActionDefinitions, Regex } from '@companion-module/base'
import type { ModuleInstance } from './main.js'
import {
	CableEmulationOptions,
	DantePortMapping,
	LowcutOptions,
	MuteOptions,
	MuteOptionsTable,
	ReceiverModel,
	SyncSettings,
} from './receiver.js'

export function UpdateActions(self: ModuleInstance): void {
	function getChannelOptions(): { id: number; label: string }[] {
		const maxChannels = self.receiver.model === ReceiverModel.EM4 ? 4 : 2
		return Array.from({ length: maxChannels }, (_, i) => ({
			id: i,
			label: `Channel ${i + 1}`,
		}))
	}

	const actions: CompanionActionDefinitions = {
		restart: {
			name: 'Device: Restart',
			options: [],
			callback: async () => {
				self.receiver.restart()
			},
		},
		brightness: {
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
				self.receiver.setBrightness(brightness)
			},
		},
		name: {
			name: 'Device: Set Name',
			options: [
				{
					id: 'name',
					type: 'textinput',
					label: 'Name (max. 18 Chars - no special characters or blanks)',
					default: '',
				},
			],
			callback: async (action) => {
				const name = String(action.options.name)
				self.receiver.setName(name)
			},
		},
		location: {
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
				self.receiver.setLocation(location)
			},
		},
		autolock: {
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
				self.receiver.setAutoLock(lock)
			},
		},
		encryption: {
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
				self.receiver.setEncryption(encryption)
			},
		},
		link_density: {
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
				self.receiver.setLinkDensityMode(linkdensity)
			},
		},
		network_settings: {
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
				self.receiver.setNetworkSettings(dhcp, mdns, ip, netmask, gateway)
			},
		},

		rx_mute: {
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
						self.receiver.channels[channel].setMuteState(true)
						break
					case 'unmute':
						self.receiver.channels[channel].setMuteState(false)
						break
					case 'toggle':
						self.receiver.channels[channel].toggleMuteState()
						break
				}
			},
		},
		rx_ss_mute_config_sk: {
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
				self.receiver.channels[channel].setMuteConfigSK(muteSetting as MuteOptions)
			},
		},
		rx_ss_mute_config_table: {
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
				self.receiver.channels[channel].setMuteConfigTable(muteSetting as MuteOptionsTable)
			},
		},
		rx_ss_ignore: {
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
				self.receiver.channels[channel].setSyncIgnore(setting as SyncSettings, ignore)
			},
		},
		rx_ss_lowcut: {
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
				self.receiver.channels[channel].setLowcut(lowcut as LowcutOptions)
			},
		},
		rx_ss_lock: {
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
				self.receiver.channels[channel].setAutoLock(lock)
			},
		},
		rx_ss_tx_led: {
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
				self.receiver.channels[channel].setTXLED(enabled)
			},
		},
		rx_ss_cable_emulation: {
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
				self.receiver.channels[channel].setCableEmulation(setting as CableEmulationOptions)
			},
		},
		rx_name: {
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
				},
			],
			callback: async (action) => {
				const channel = Number(action.options.receiver)
				const name = String(action.options.name)
				self.receiver.channels[channel].setName(name)
			},
		},
		rx_gain: {
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
				self.receiver.channels[channel].setGain(gain)
			},
		},
		rx_gain_relative: {
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

				const currentGain = self.receiver.channels[channel].gain
				let index = availableGains.indexOf(currentGain)

				if (direction === 'increase') {
					index = Math.min(index + steps, availableGains.length - 1)
				} else if (direction === 'decrease') {
					index = Math.max(index - steps, 0)
				} else {
					console.error('Invalid gain adjustment')
				}

				const newGain = availableGains[index]
				self.receiver.channels[channel].setGain(newGain)
			},
		},
		rx_freq: {
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
				self.receiver.channels[channel].setFrequency(freq)
			},
		},
		rx_identification: {
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
				self.receiver.channels[channel].setIdentification(ident)
			},
		},
	}

	/* Dante model specific actions  */

	if (self.receiver.model === ReceiverModel.EM4 || self.receiver.model === ReceiverModel.EM2_DANTE) {
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
				self.receiver.setDanteNetworkSettings(interfaceId, dhcp, ip, netmask, gateway)
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
				self.receiver.setDantePortMapping(setting)
			},
		}
	}

	self.setActionDefinitions(actions)
}
