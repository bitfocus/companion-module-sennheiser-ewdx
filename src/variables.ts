import { EWDXReceiver } from './ewdxReceiver.js'
import { EWDXReceiverSCPv2 } from './ewdxReceiverSCPv2.js'
import type { ModuleInstance } from './main.js'
import { DeviceModel } from './ewdx.js'
import { CHG70N } from './chg70n.js'

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	// Helper function to check if device is a receiver (SCPv1 or SCPv2)
	function isReceiver(device: any): device is EWDXReceiver | EWDXReceiverSCPv2 {
		return device instanceof EWDXReceiver || device instanceof EWDXReceiverSCPv2
	}

	if (isReceiver(self.device)) {
		const numChannels = self.device.model === DeviceModel.EM4 ? 4 : 2

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

		const allVariables: { variableId: string; name: string }[] = [
			...deviceVariables,
			...networkVariables,
			...(self.device.model === DeviceModel.EM2_DANTE || self.device.model === DeviceModel.EM4 ? danteVariables : []),
			...rxChannelVariables.flat(),
			...txChannelVariables.flat(),
		]

		self.setVariableDefinitions(allVariables)
	} else if (self.device instanceof CHG70N) {
		const bayVariables = Array.from({ length: 2 }, (_, i) => [
			{ variableId: `bay${i + 1}_update_progress`, name: `Update progress of bay ${i + 1}` },
			{ variableId: `bay${i + 1}_update`, name: `Update state of bay ${i + 1}` },
			{ variableId: `bay${i + 1}_update_error`, name: `Update errors of bay ${i + 1}` },
			{ variableId: `bay${i + 1}_timeToFull`, name: `Time (minutes) until battery is full in bay ${i + 1}` },
			{ variableId: `bay${i + 1}_batCycles`, name: `Number of charging cycles for battery in bay ${i + 1}` },
			{ variableId: `bay${i + 1}_batGauge`, name: `Charge (percent) for battery in bay ${i + 1}` },
			{ variableId: `bay${i + 1}_batHealth`, name: `Health (percent) for battery in bay ${i + 1}` },
			{ variableId: `bay${i + 1}_chargingDevice`, name: `Battery type in bay ${i + 1}` },
			{ variableId: `bay${i + 1}_txSerial`, name: `Serial number of device in bay ${i + 1}` },
			{ variableId: `bay${i + 1}_txVersion`, name: `Firmware version of device in bay ${i + 1}` },
			{ variableId: `bay${i + 1}_identification`, name: `Identification active for bay ${i + 1}` },
			{ variableId: `bay${i + 1}_state`, name: `State for bay ${i + 1}` },
			{ variableId: `bay${i + 1}_warnings`, name: `Warnings for bay ${i + 1}` },
			{ variableId: `bay${i + 1}_syncError`, name: `Sync error for bay ${i + 1}` },
		])
		const deviceVariables = [
			{ variableId: 'device_location', name: 'Location' },
			{ variableId: 'device_name', name: 'Name' },
			{ variableId: 'device_identification', name: 'Visual Identification' },
			{ variableId: 'device_storagemode', name: 'Storage mode' },
			{ variableId: 'device_productlabel', name: 'Product label' },
			{ variableId: 'device_version', name: 'Device version' },
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

		const allVariables: { variableId: string; name: string }[] = [
			...deviceVariables,
			...bayVariables.flat(),
			...networkVariables,
		]

		self.setVariableDefinitions(allVariables)
	}
}
