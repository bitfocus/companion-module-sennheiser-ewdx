import type { ModuleInstance } from './main.js'
import { ReceiverModel } from './receiver.js'

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	const numChannels = self.receiver.model === ReceiverModel.EM4 ? 4 : 2

	const deviceVariables = [
		{ variableId: 'receiver_brightness', name: 'Brightness' },
		{ variableId: 'receiver_autoLock', name: 'Auto Lock' },
		{ variableId: 'receiver_frequencyCode', name: 'Frequency Code' },
		{ variableId: 'receiver_encryption', name: 'Encryption' },
		{ variableId: 'receiver_linkDensityMode', name: 'Link Density Mode' },
		{ variableId: 'receiver_location', name: 'Location' },
		{ variableId: 'receiver_name', name: 'Name' },
		{ variableId: 'receiver_firmwareVersion', name: 'Firmware Version' },
		{ variableId: 'receiver_identification', name: 'Visual Identification' },
		{ variableId: 'receiver_serialNumber', name: 'Serial Number' },
	]

	const danteVariables = [
		{ variableId: 'dante_interface_mapping', name: 'Dante Interface Mapping Configuration' },
		{ variableId: 'dante_primary_netmask_dhcp', name: 'Dante Primary Netmask (DHCP)' },
		{ variableId: 'dante_primary_manual_netmask', name: 'Dante Primary Manual Netmask' },
		{ variableId: 'dante_primary_ip_dhcp', name: 'Dante Primary IP Address (DHCP)' },
		{ variableId: 'dante_primary_ip_manual', name: 'Dante Primary IP Address Manual' },
		{ variableId: 'dante_primary_gateway_dhcp', name: 'Dante Primary Gateway (DHCP)' },
		{ variableId: 'dante_primary_gateway_manual', name: 'Dante Primary Gateway Manual' },
		{ variableId: 'dante_primary_dhcp', name: 'Dante Primary DHCP' },
		{ variableId: 'dante_primary_interface_name', name: 'Dante Primary Interface Name' },
		{ variableId: 'dante_primary_mac', name: 'Dante Primary MAC Address' },
		{ variableId: 'dante_secondary_netmask_dhcp', name: 'Dante Secondary Netmask (DHCP)' },
		{ variableId: 'dante_secondary_manual_netmask', name: 'Dante Secondary Manual Netmask' },
		{ variableId: 'dante_secondary_ip_dhcp', name: 'Dante Secondary IP Address (DHCP)' },
		{ variableId: 'dante_secondary_ip_manual', name: 'Dante Secondary IP Address Manual' },
		{ variableId: 'dante_secondary_gateway_dhcp', name: 'Dante Secondary Gateway (DHCP)' },
		{ variableId: 'dante_secondary_gateway_manual', name: 'Dante Secondary Gateway Manual' },
		{ variableId: 'dante_secondary_dhcp', name: 'Dante Secondary DHCP' },
		{ variableId: 'dante_secondary_interface_name', name: 'Dante Secondary Interface Name' },
		{ variableId: 'dante_secondary_mac', name: 'Dante Secondary MAC Address' },
		{ variableId: 'device_dante_version', name: 'Dante Version' },
	]

	const networkVariables = [
		{ variableId: 'device_netmask_dhcp', name: 'Device Netmask (DHCP)' },
		{ variableId: 'device_manual_netmask', name: 'Device Manual Netmask' },
		{ variableId: 'device_ip_dhcp', name: 'Device IP Address (DHCP)' },
		{ variableId: 'device_ip_manual', name: 'Device IP Address Manual' },
		{ variableId: 'device_gateway_dhcp', name: 'Device Gateway (DHCP)' },
		{ variableId: 'device_gateway_manual', name: 'Device Gateway Manual' },
		{ variableId: 'device_dhcp', name: 'Device DHCP' },
		{ variableId: 'device_mdns', name: 'Device MDNS' },
	]

	const rxChannelVariables = Array.from({ length: numChannels }, (_, i) => [
		{ variableId: `rx${i + 1}_name`, name: `Name of RX Channel ${i + 1}` },
		{ variableId: `rx${i + 1}_muted`, name: `Muted RX Channel ${i + 1}` },
		{ variableId: `rx${i + 1}_gain`, name: `Gain of RX Channel ${i + 1}` },
		{ variableId: `rx${i + 1}_frequency`, name: `Frequency of RX Channel ${i + 1}` },
		{ variableId: `rx${i + 1}_identification`, name: `Identification of RX Channel ${i + 1}` },
		{ variableId: `rx${i + 1}_activeAntenna`, name: `Active Antenna of RX Channel ${i + 1}` },
		{ variableId: `rx${i + 1}_rsqi`, name: `RSQI of RX Channel ${i + 1}` },
		{ variableId: `rx${i + 1}_warnings`, name: `Warnings of RX Channel ${i + 1}` },
		{ variableId: `rx${i + 1}_sync_ignore_trim`, name: `Ignore Trim during Sync` },
		{ variableId: `rx${i + 1}_sync_ignore_name`, name: `Ignore Name during Sync` },
		{ variableId: `rx${i + 1}_sync_ignore_mute_config`, name: `Ignore Mute Config during Sync` },
		{ variableId: `rx${i + 1}_sync_ignore_lowcut`, name: `Ignore Lowcut during Sync` },
		{ variableId: `rx${i + 1}_sync_ignore_lock`, name: `Ignore Lock during Sync` },
		{ variableId: `rx${i + 1}_sync_ignore_led`, name: `Ignore LED during Sync` },
		{ variableId: `rx${i + 1}_sync_ignore_frequency`, name: `Ignore Frequency during Sync` },
		{ variableId: `rx${i + 1}_sync_ignore_cable_emulation`, name: `Ignore Cable Emulation during Sync` },
		{ variableId: `rx${i + 1}_sync_trim`, name: `Sync Trim value` },
		{ variableId: `rx${i + 1}_sync_mute_config_ts`, name: `Sync Mute Config Table Stand value` },
		{ variableId: `rx${i + 1}_sync_mute_config`, name: `Sync Mute Config [SK(M)] value` },
		{ variableId: `rx${i + 1}_sync_lowcut`, name: `Sync Lowcut value` },
		{ variableId: `rx${i + 1}_sync_lock`, name: `Sync Lock value` },
		{ variableId: `rx${i + 1}_sync_led`, name: `Sync LED value` },
		{ variableId: `rx${i + 1}_sync_cable_emulation`, name: `Sync Cable Emulation value` },
	])

	const txChannelVariables = Array.from({ length: numChannels }, (_, i) => [
		{ variableId: `tx${i + 1}_batteryGauge`, name: `Battery Gauge of TX Channel ${i + 1} in percent` },
		{ variableId: `tx${i + 1}_batteryType`, name: `Battery Type of TX Channel ${i + 1}` },
		{ variableId: `tx${i + 1}_batteryLifetime`, name: `Battery Lifetime of TX Channel ${i + 1} in minutes` },
		{ variableId: `tx${i + 1}_capsule`, name: `Capsule of TX Channel ${i + 1}` },
		{ variableId: `tx${i + 1}_muted`, name: `Muted TX Channel ${i + 1}` },
		{ variableId: `tx${i + 1}_trim`, name: `Trim of TX Channel ${i + 1}` },
		{ variableId: `tx${i + 1}_type`, name: `Type of TX Channel ${i + 1}` },
		{ variableId: `tx${i + 1}_name`, name: `Name of TX Channel ${i + 1}` },
		{ variableId: `tx${i + 1}_lowcut`, name: `Lowcut of TX Channel ${i + 1}` },
		{ variableId: `tx${i + 1}_lock`, name: `Lock of TX Channel ${i + 1}` },
		{ variableId: `tx${i + 1}_led`, name: `LED of TX Channel ${i + 1}` },
		{ variableId: `tx${i + 1}_identification`, name: `Identification of TX Channel ${i + 1}` },
		{ variableId: `tx${i + 1}_cableEmulation`, name: `Cable Emulation of TX Channel ${i + 1}` },
	])

	const flattenedRxVariables = rxChannelVariables.flat()
	const flattenedTxVariables = txChannelVariables.flat()

	const allVariables: { variableId: string; name: string }[] = [
		...deviceVariables,
		...networkVariables,
		...(self.receiver.model === ReceiverModel.EM2_DANTE || self.receiver.model === ReceiverModel.EM4
			? danteVariables
			: []),
		...flattenedRxVariables,
		...flattenedTxVariables,
	]

	self.setVariableDefinitions(allVariables)
}
