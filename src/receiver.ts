/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { RemoteInfo } from 'dgram'
import { ModuleInstance } from './main.js'
import { SharedUdpSocket } from '@companion-module/base'

const UNKNOWN = 'nAn'
const pollingInterval = 59000

class NetworkInterface {
	manualIP: string
	manualNetmask: string
	manualGateway: string
	ip: string
	netmask: string
	gateway: string
	dhcp: boolean
	mac: string
	name: string

	constructor() {
		this.manualIP = UNKNOWN
		this.manualNetmask = UNKNOWN
		this.manualGateway = UNKNOWN
		this.ip = UNKNOWN
		this.netmask = UNKNOWN
		this.gateway = UNKNOWN
		this.dhcp = false
		this.mac = UNKNOWN
		this.name = UNKNOWN
	}
}

export class EWDXReceiver {
	// private udpSocket
	private socket: SharedUdpSocket
	host: string
	context: ModuleInstance
	model: ReceiverModel

	firmwareVersion: string
	brightness: number
	encryption: boolean
	frequencyCode: string
	linkDensityMode: boolean
	lock: boolean
	location: string
	name: string
	identification: boolean
	serialNumber: string
	danteVersion: string
	networkInterface: NetworkInterface
	dantePrimary: NetworkInterface
	danteSecondary: NetworkInterface
	danteInterfaceMapping: DantePortMapping
	mdns: boolean

	channels: RxChannel[]

	constructor(context: ModuleInstance, model: ReceiverModel, host: string) {
		this.context = context
		this.model = model
		this.host = host
		this.firmwareVersion = UNKNOWN
		this.brightness = 0
		this.encryption = false
		this.frequencyCode = UNKNOWN
		this.linkDensityMode = false
		this.lock = false
		this.location = UNKNOWN
		this.name = UNKNOWN
		this.channels = []
		this.identification = false
		this.serialNumber = UNKNOWN
		this.danteVersion = UNKNOWN
		this.dantePrimary = new NetworkInterface()
		this.danteSecondary = new NetworkInterface()
		this.networkInterface = new NetworkInterface()
		this.danteInterfaceMapping = DantePortMapping.SINGLE_CABLE
		this.mdns = false

		this.channels[0] = new RxChannel(1, this)
		this.channels[1] = new RxChannel(2, this)

		if (model == ReceiverModel.EM4) {
			this.channels[2] = new RxChannel(3, this)
			this.channels[3] = new RxChannel(4, this)
		}

		// this.udpSocket = createSocket('udp4')
		this.socket = context.createSharedUdpSocket('udp4', (msg, rinfo) => this.parseMessage(msg, rinfo))

		this.setupListeners()

		this.initSubscriptions()

		setTimeout(() => {
			this.getStaticInformation()
		}, 1000)

		setInterval(() => {
			this.initSubscriptions()
			this.getStaticInformation()
		}, pollingInterval)
	}

	restart() {
		this.sendCommand('/device/restart', true)
	}

	setBrightness(brightness: number) {
		this.sendCommand('/device/brightness', brightness)
	}

	setName(name: string) {
		this.sendCommand('/device/name', name)
	}

	setLocation(location: string) {
		this.sendCommand('/device/location', location)
	}

	setAutoLock(lock: boolean) {
		this.sendCommand('/device/lock', lock)
	}

	setEncryption(encryption: boolean) {
		this.sendCommand('/device/encryption', encryption)
	}

	setLinkDensityMode(enable: boolean) {
		this.sendCommand('/device/link_density_mode', enable)
	}

	setNetworkSettings(dhcp: boolean, mdns: boolean, ip: string, netmask: string, gateway: string) {
		this.sendCommand('/device/network/ipv4/auto', dhcp)
		this.sendCommand('/device/network/mdns', mdns)
		if (ip != '' && ip != null) this.sendCommand('/device/network/ipv4/manual_ipaddr', ip)
		if (netmask != '' && netmask != null) this.sendCommand('/device/network/ipv4/manual_netmask', netmask)
		if (gateway != '' && gateway != null) this.sendCommand('/device/network/ipv4/manual_gateway', gateway)
	}

	//ToDo: Further checking needed - trying to set only one DHCP option and setting the other value to null is not working
	setDanteNetworkSettings(interfaceId: number, dhcp: boolean, ip: string, netmask: string, gateway: string) {
		this.sendCommand('/device/network/dante/ipv4/auto', interfaceId == 0 ? [dhcp, null] : [null, dhcp])
		if (ip != '' && ip != null)
			this.sendCommand('/device/network/dante/ipv4/manual_ipaddr', interfaceId == 0 ? [ip, null] : [null, ip])
		if (netmask != '' && netmask != null)
			this.sendCommand(
				'/device/network/dante/ipv4/manual_netmask',
				interfaceId == 0 ? [netmask, null] : [null, netmask],
			)
		if (gateway != '' && gateway != null)
			this.sendCommand(
				'/device/network/dante/ipv4/manual_gateway',
				interfaceId == 0 ? [gateway, null] : [null, gateway],
			)
	}

	setDantePortMapping(mapping: DantePortMapping) {
		this.sendCommand('/device/network/dante/interface_mapping', DantePortMapping[mapping])
	}

	getStaticInformation() {
		this.sendCommand('/device/identity/version', null)
		this.sendCommand('/device/identity/serial', null)
		this.sendCommand('/device/frequency_code', null)
		this.sendCommand('/device/network/dante/interfaces', null)
		this.sendCommand('/device/network/dante/macs', null)
		this.sendCommand('/device/network/ether/interfaces', null)
		this.sendCommand('/device/network/ether/macs', null)
	}

	publishVariableValues() {
		this.context.setVariableValues({
			receiver_brightness: this.brightness,
			receiver_autoLock: this.lock,
			receiver_frequencyCode: this.frequencyCode,
			receiver_encryption: this.encryption,
			receiver_linkDensityMode: this.linkDensityMode,
			receiver_location: this.location,
			receiver_name: this.name,
			receiver_firmwareVersion: this.firmwareVersion,
			receiver_identification: this.identification,
			receiver_serialNumber: this.serialNumber,
			dante_interface_mapping: this.danteInterfaceMapping,
			dante_primary_netmask_dhcp: this.dantePrimary.netmask,
			dante_primary_manual_netmask: this.dantePrimary.manualNetmask,
			dante_primary_ip_dhcp: this.dantePrimary.ip,
			dante_primary_ip_manual: this.dantePrimary.manualIP,
			dante_primary_gateway_dhcp: this.dantePrimary.gateway,
			dante_primary_gateway_manual: this.dantePrimary.manualGateway,
			dante_primary_dhcp: this.dantePrimary.dhcp,
			dante_primary_interface_name: this.dantePrimary.name,
			dante_primary_mac: this.dantePrimary.mac,
			dante_secondary_netmask_dhcp: this.danteSecondary.netmask,
			dante_secondary_manual_netmask: this.danteSecondary.manualNetmask,
			dante_secondary_ip_dhcp: this.danteSecondary.ip,
			dante_secondary_ip_manual: this.danteSecondary.manualIP,
			dante_secondary_gateway_dhcp: this.danteSecondary.gateway,
			dante_secondary_gateway_manual: this.danteSecondary.manualGateway,
			dante_secondary_dhcp: this.danteSecondary.dhcp,
			dante_secondary_interface_name: this.danteSecondary.name,
			dante_secondary_mac: this.danteSecondary.mac,
			device_dante_version: this.danteVersion,
			device_netmask_dhcp: this.networkInterface.netmask,
			device_manual_netmask: this.networkInterface.manualNetmask,
			device_ip_dhcp: this.networkInterface.ip,
			device_ip_manual: this.networkInterface.manualIP,
			device_gateway_dhcp: this.networkInterface.gateway,
			device_gateway_manual: this.networkInterface.manualGateway,
			device_dhcp: this.networkInterface.dhcp,
			device_mdns: this.mdns,
		})
	}

	sendCommand(path: string, value: any) {
		const cmd = oscToJson(path, value)
		const message = JSON.stringify(cmd)
		this.sendMessage(message)
	}

	private sendMessage(message: string) {
		this.socket.send(message, 45, this.host)
	}

	private setupListeners() {
		this.socket.bind(45, this.host, () => {
			console.log('Socket successfully connected.')
		})

		this.socket.on('error', (err) => {
			console.error('Socket error:', err)
			// this.udpSocket.close()
		})

		this.socket.on('close', () => {
			console.log('Socket closed!')
		})
	}

	initSubscriptions() {
		const defaultRxSettings = {
			warnings: null,
			divi: null,
			frequency: null,
			name: null,
			identification: {
				visual: null,
			},
			gain: null,
			mute: null,
			sync_settings: {
				trim_ignore: null,
				name_ignore: null,
				mute_config_ignore: null,
				lowcut_ignore: null,
				lock_ignore: null,
				led_ignore: null,
				frequency_ignore: null,
				cable_emulation_ignore: null,
				trim: null,
				mute_config_ts: null,
				mute_config: null,
				lowcut: null,
				lock: null,
				led: null,
				cable_emulation: null,
			},
		}
		const msgRX1 = {
			osc: {
				state: {
					subscribe: [
						{
							'#': {
								lifetime: 60,
							},
							rx1: { ...defaultRxSettings },
							rx2: { ...defaultRxSettings },
						},
					],
				},
			},
		}
		setTimeout(() => {
			this.sendMessage(JSON.stringify(msgRX1))
		}, 1000)

		if (this.model === ReceiverModel.EM4 || this.model === ReceiverModel.EM2_DANTE) {
			const msgRX2 = {
				osc: {
					state: {
						subscribe: [
							{
								'#': {
									lifetime: 60,
								},
								rx3: { ...defaultRxSettings },
								rx4: { ...defaultRxSettings },
							},
						],
					},
				},
			}
			setTimeout(() => {
				this.sendMessage(JSON.stringify(msgRX2))
			}, 1000)
		}

		const defaultTxSettings = {
			battery: {
				gauge: null,
				type: null,
				lifetime: null,
			},
			capsule: null,
			mute: null,
			warnings: null,
			type: null,
			trim: null,
			name: null,
			mute_config_ts: null,
			mute_config: null,
			lowcut: null,
			lock: null,
			led: null,
			identification: null,
			cable_emulation: null,
		}

		const msgMates = {
			osc: {
				state: {
					subscribe: [
						{
							'#': { lifetime: 60 },
							mates: {
								tx1: { ...defaultTxSettings },
								tx2: { ...defaultTxSettings },
								...(this.model === ReceiverModel.EM4 || this.model === ReceiverModel.EM2_DANTE
									? {
											tx3: { ...defaultTxSettings },
											tx4: { ...defaultTxSettings },
										}
									: {}),
							},
						},
						{
							m: {
								rx1: { divi: null, rsqi: null },
								rx2: { divi: null, rsqi: null },
								...(this.model === ReceiverModel.EM4 || this.model === ReceiverModel.EM2_DANTE
									? {
											rx3: { divi: null, rsqi: null },
											rx4: { divi: null, rsqi: null },
										}
									: {}),
							},
						},
					],
				},
			},
		}

		setTimeout(() => {
			this.sendMessage(JSON.stringify(msgMates))
		}, 1000)

		const msgDevice = {
			osc: {
				state: {
					subscribe: [
						{
							'#': {
								lifetime: 60,
							},
							device: {
								encryption: null,
								brightness: null,
								booster: null,
								location: null,
								lock: null,
								link_density_mode: null,
								name: null,
								identification: null,
							},
						},
					],
				},
			},
		}

		setTimeout(() => {
			this.sendMessage(JSON.stringify(msgDevice))
		}, 1000)

		const msgNetwork = {
			osc: {
				state: {
					subscribe: [
						{
							'#': {
								lifetime: 60,
							},
							device: {
								network: {
									dante: {
										identity: {
											version: null,
										},
										ipv4: {
											netmask: null,
											manual_netmask: null,
											manual_ipaddr: null,
											manual_gateway: null,
											ipaddr: null,
											gateway: null,
											auto: null,
											macs: null,
										},
										interface_mapping: null,
									},
									ipv4: {
										manual_netmask: null,
										manual_ipaddr: null,
										manual_gateway: null,
										netmask: null,
										ipaddr: null,
										gateway: null,
										auto: null,
									},
									mdns: null,
								},
							},
						},
					],
				},
			},
		}
		setTimeout(() => {
			this.sendMessage(JSON.stringify(msgNetwork))
		}, 1000)
	}

	private parseMessage(raw: Uint8Array, rinfo: RemoteInfo) {
		if (rinfo.address == this.host && rinfo.port == 45) {
			const message = Buffer.from(raw).toString()

			const json = JSON.parse(message)

			if (json.device) {
				if (json.device.encryption != undefined) {
					this.encryption = json.device.encryption
				}
				if (json.device.link_density_mode != undefined) {
					this.linkDensityMode = json.device.link_density_mode
				}
				if (json.device.brightness != undefined) {
					this.brightness = json.device.brightness
				}
				if (json.device.name != undefined) {
					this.name = json.device.name
				}
				if (json.device.frequency_code != undefined) {
					this.frequencyCode = json.device.frequency_code
				}
				if (json.device.lock != undefined) {
					this.lock = json.device.lock
				}
				if (json.device.location != undefined) {
					this.location = json.device.location
				}
				if (json.device.identity != undefined) {
					if (json.device.identity.version != undefined) {
						this.firmwareVersion = json.device.identity.version
					}
					if (json.device.identity.serial != undefined) {
						this.serialNumber = json.device.identity.serial
					}
				}
				if (json.device.identification != undefined) {
					if (json.device.identification.visual != undefined) {
						this.identification = json.device.identification.visual
					}
				}
				if (json.device.network != undefined) {
					if (json.device.network.dante != undefined) {
						if (json.device.network.dante.identity != undefined) {
							if (json.device.network.dante.identity.version != undefined) {
								this.danteVersion = json.device.network.dante.identity.version
							}
						}
						if (json.device.network.dante.interface_mapping != undefined) {
							this.danteInterfaceMapping = json.device.network.dante.interface_mapping
						}
						if (json.device.network.dante.macs != undefined) {
							this.dantePrimary.mac = json.device.network.dante.macs[0]
							this.danteSecondary.mac = json.device.network.dante.macs[1]
						}
						if (json.device.network.dante.interfaces != undefined) {
							this.dantePrimary.name = json.device.network.dante.interfaces[0]
							this.danteSecondary.name = json.device.network.dante.interfaces[1]
						}
						if (json.device.network.dante.ipv4 != undefined) {
							if (json.device.network.dante.ipv4.netmask != undefined) {
								this.dantePrimary.netmask = json.device.network.dante.ipv4.netmask[0]
								this.danteSecondary.netmask = json.device.network.dante.ipv4.netmask[1]
							}
							if (json.device.network.dante.ipv4.manual_netmask != undefined) {
								this.dantePrimary.manualNetmask = json.device.network.dante.ipv4.manual_netmask[0]
								this.danteSecondary.manualNetmask = json.device.network.dante.ipv4.manual_netmask[1]
							}
							if (json.device.network.dante.ipv4.ipaddr != undefined) {
								this.dantePrimary.ip = json.device.network.dante.ipv4.ipaddr[0]
								this.danteSecondary.ip = json.device.network.dante.ipv4.ipaddr[1]
							}
							if (json.device.network.dante.ipv4.manual_ipaddr != undefined) {
								this.dantePrimary.manualIP = json.device.network.dante.ipv4.manual_ipaddr[0]
								this.danteSecondary.manualIP = json.device.network.dante.ipv4.manual_ipaddr[1]
							}
							if (json.device.network.dante.ipv4.gateway != undefined) {
								this.dantePrimary.gateway = json.device.network.dante.ipv4.gateway[0]
								this.danteSecondary.gateway = json.device.network.dante.ipv4.gateway[1]
							}
							if (json.device.network.dante.ipv4.manual_gateway != undefined) {
								this.dantePrimary.manualGateway = json.device.network.dante.ipv4.manual_gateway[0]
								this.danteSecondary.manualGateway = json.device.network.dante.ipv4.manual_gateway[1]
							}
							if (json.device.network.dante.ipv4.auto != undefined) {
								this.dantePrimary.dhcp = json.device.network.dante.ipv4.auto[0]
								this.danteSecondary.dhcp = json.device.network.dante.ipv4.auto[1]
							}
						}
					}
					if (json.device.network.ipv4 != undefined) {
						if (json.device.network.ipv4.manual_netmask != undefined) {
							this.networkInterface.manualNetmask = json.device.network.ipv4.manual_netmask
						}
						if (json.device.network.ipv4.manual_ipaddr != undefined) {
							this.networkInterface.manualIP = json.device.network.ipv4.manual_ipaddr
						}
						if (json.device.network.ipv4.manual_gateway != undefined) {
							this.networkInterface.manualGateway = json.device.network.ipv4.manual_gateway
						}
						if (json.device.network.ipv4.netmask != undefined) {
							this.networkInterface.netmask = json.device.network.ipv4.netmask
						}
						if (json.device.network.ipv4.ipaddr != undefined) {
							this.networkInterface.ip = json.device.network.ipv4.ipaddr
						}
						if (json.device.network.ipv4.gateway != undefined) {
							this.networkInterface.gateway = json.device.network.ipv4.gateway
						}
						if (json.device.network.ipv4.auto != undefined) {
							this.networkInterface.dhcp = json.device.network.ipv4.auto
						}
					}
					if (json.device.network.mdns != undefined) {
						this.mdns = json.device.network.mdns
					}
				}
				this.publishVariableValues()
			}

			if (json.m) {
				for (let i = 1; i <= this.channels.length; i++) {
					const rxKey = `rx${i}`
					if (json.m[rxKey]) {
						if (json.m[rxKey].divi != undefined) {
							this.channels[i - 1].activeAntenna = json.m[rxKey].divi
						}
						if (json.m[rxKey].rsqi != undefined) {
							this.channels[i - 1].rsqi = json.m[rxKey].rsqi
						}
					}
				}
			}

			if (json.mates) {
				for (let i = 1; i <= this.channels.length; i++) {
					const txKey = `tx${i}`
					if (json.mates[txKey]) {
						if (json.mates[txKey].mute != undefined) {
							this.channels[i - 1].mate.muted = json.mates[txKey].mute
						}
						if (json.mates[txKey].battery != undefined) {
							if (json.mates[txKey].battery.gauge != undefined) {
								this.channels[i - 1].mate.batteryGauge = json.mates[txKey].battery.gauge
							}
							if (json.mates[txKey].battery.type != undefined) {
								this.channels[i - 1].mate.batteryType = json.mates[txKey].battery.type
							}
							if (json.mates[txKey].battery.lifetime != undefined) {
								this.channels[i - 1].mate.batteryLifetime = json.mates[txKey].battery.lifetime
							}
						}
						if (json.mates[txKey].cable_emulation != undefined) {
							this.channels[i - 1].mate.cableEmulation = json.mates[txKey].cable_emulation
						}
						if (json.mates[txKey].capsule != undefined) {
							this.channels[i - 1].mate.capsule = json.mates[txKey].capsule
						}
						if (json.mates[txKey].identification != undefined) {
							this.channels[i - 1].mate.identification = json.mates[txKey].identification
						}
						if (json.mates[txKey].led != undefined) {
							this.channels[i - 1].mate.led = json.mates[txKey].led
						}
						if (json.mates[txKey].lock != undefined) {
							this.channels[i - 1].mate.lock = json.mates[txKey].lock
						}
						if (json.mates[txKey].lowcut != undefined) {
							this.channels[i - 1].mate.lowcut = json.mates[txKey].lowcut
						}
						if (json.mates[txKey].mute != undefined) {
							this.channels[i - 1].mate.muted = json.mates[txKey].mute
						}
						if (json.mates[txKey].name != undefined) {
							this.channels[i - 1].mate.name = json.mates[txKey].name
						}
						if (json.mates[txKey].trim != undefined) {
							this.channels[i - 1].mate.trim = json.mates[txKey].trim
						}
						if (json.mates[txKey].type != undefined) {
							this.channels[i - 1].mate.type = json.mates[txKey].type
						}
					}
				}
			}

			for (let i = 1; i <= this.channels.length; i++) {
				const rxKey = `rx${i}`
				if (json[rxKey]) {
					const rxData = json[rxKey]
					const channel = this.channels[i - 1]

					if (rxData.warnings !== undefined) {
						channel.hasAes256Error = false
						channel.hasAfPeakWarning = false
						channel.warnings = rxData.warnings.length > 0
						if (channel.warnings) {
							if (rxData.warnings.includes('Aes256Error')) {
								channel.hasAes256Error = true
							}
							if (rxData.warnings.includes('AfPeak')) {
								channel.hasAfPeakWarning = true
							}
						}
					}

					if (rxData.frequency !== undefined) {
						channel.frequency = rxData.frequency
					}

					if (rxData.name !== undefined) {
						channel.name = rxData.name
					}

					if (rxData.mute !== undefined) {
						channel.muted = rxData.mute
					}

					if (rxData.gain !== undefined) {
						channel.gain = rxData.gain
					}

					if (rxData.identification?.visual != undefined) {
						channel.identification = rxData.identification.visual
					}

					if (rxData.sync_settings != undefined) {
						if (rxData.sync_settings.trim_ignore != undefined) {
							channel.syncIgnoreTrim = rxData.sync_settings.trim_ignore
						}
						if (rxData.sync_settings.name_ignore != undefined) {
							channel.syncIgnoreName = rxData.sync_settings.name_ignore
						}
						if (rxData.sync_settings.mute_config_ignore != undefined) {
							channel.syncIgnoreMuteConfig = rxData.sync_settings.mute_config_ignore
						}
						if (rxData.sync_settings.lowcut_ignore != undefined) {
							channel.syncIgnoreLowcut = rxData.sync_settings.lowcut_ignore
						}
						if (rxData.sync_settings.lock_ignore != undefined) {
							channel.syncIgnoreLock = rxData.sync_settings.lock_ignore
						}
						if (rxData.sync_settings.led_ignore != undefined) {
							channel.syncIgnoreLED = rxData.sync_settings.led_ignore
						}
						if (rxData.sync_settings.frequency_ignore != undefined) {
							channel.syncIgnoreFrequency = rxData.sync_settings.frequency_ignore
						}
						if (rxData.sync_settings.cable_emulation_ignore != undefined) {
							channel.syncIgnoreCableEmulation = rxData.sync_settings.cable_emulation_ignore
						}
						if (rxData.sync_settings.trim != undefined) {
							channel.syncTrim = rxData.sync_settings.trim
						}
						if (rxData.sync_settings.mute_config_ts != undefined) {
							channel.syncMuteConfigTS = rxData.sync_settings.mute_config_ts
						}
						if (rxData.sync_settings.mute_config != undefined) {
							channel.syncMuteConfig = rxData.sync_settings.mute_config
						}
						if (rxData.sync_settings.lowcut != undefined) {
							channel.syncLowcut = rxData.sync_settings.lowcut
						}
						if (rxData.sync_settings.lock != undefined) {
							channel.syncLock = rxData.sync_settings.lock
						}
						if (rxData.sync_settings.led != undefined) {
							channel.syncLED = rxData.sync_settings.led
						}
						if (rxData.sync_settings.cable_emulation != undefined) {
							channel.syncCableEmulation = rxData.sync_settings.cable_emulation
						}
					}
				}
			}
			this.context.checkFeedbacks()
			for (let i = 1; i <= this.channels.length; i++) {
				this.channels[i - 1].publishVariableValues()
			}
		}
	}
}

class TxMate {
	parentDevice: EWDXReceiver
	batteryGauge: number
	batteryType: string
	batteryLifetime: number
	capsule: string
	muted: boolean
	type: string
	trim: number
	name: string
	lowcut: number
	lock: boolean
	led: string
	identification: boolean
	cableEmulation: boolean
	muteConfig: MuteOptions | MuteOptionsTable

	constructor(parentDevice: EWDXReceiver) {
		this.parentDevice = parentDevice
		this.batteryGauge = 0
		this.batteryType = UNKNOWN
		this.batteryLifetime = 0
		this.capsule = UNKNOWN
		this.muted = false
		this.type = UNKNOWN
		this.trim = 0
		this.name = UNKNOWN
		this.lowcut = 0
		this.lock = false
		this.led = UNKNOWN
		this.identification = false
		this.cableEmulation = false
		this.muteConfig = MuteOptions.off
	}
}

export enum MuteOptions {
	off,
	rf_mute,
	af_mute,
}

export enum MuteOptionsTable {
	off,
	af_mute,
	push_to_talk,
	push_to_mute,
}

export enum SyncSettings {
	trim_ignore,
	name_ignore,
	mute_config_ignore,
	lowcut_ignore,
	lock_ignore,
	led_ignore,
	frequency_ignore,
	cable_emulation_ignore,
}

export enum LowcutOptions {
	off,
	'30 Hz',
	'60 Hz',
	'80 Hz',
	'100 Hz',
	'120 Hz',
}

export enum CableEmulationOptions {
	off,
	type1,
	type2,
	type3,
}

export enum ReceiverModel {
	EM4,
	EM2,
	EM2_DANTE,
}

export enum DantePortMapping {
	SINGLE_CABLE,
	SPLIT1,
	SPLIT2,
	SPLIT,
	AUDIO_REDUNDANCY,
}

class RxChannel {
	parentDevice: EWDXReceiver
	index: number
	name: string
	muted: boolean
	mate: TxMate
	gain: number
	frequency: number
	audio: string
	identification: boolean
	activeAntenna: number
	rsqi: number
	warnings: boolean
	syncIgnoreTrim: boolean
	syncIgnoreName: boolean
	syncIgnoreMuteConfig: boolean
	syncIgnoreLowcut: boolean
	syncIgnoreLock: boolean
	syncIgnoreLED: boolean
	syncIgnoreFrequency: boolean
	syncIgnoreCableEmulation: boolean
	syncTrim: number
	syncMuteConfigTS: MuteOptionsTable
	syncMuteConfig: MuteOptions
	syncLowcut: LowcutOptions
	syncLock: boolean
	syncLED: boolean
	syncCableEmulation: boolean

	hasAes256Error: boolean
	hasAfPeakWarning: boolean

	constructor(index: number, parentDevice: EWDXReceiver) {
		this.parentDevice = parentDevice
		this.index = index
		this.name = UNKNOWN
		this.muted = false
		this.mate = new TxMate(this.parentDevice)
		this.gain = 0
		this.frequency = 0
		this.audio = UNKNOWN
		this.identification = false
		this.activeAntenna = 0
		this.rsqi = 0
		this.warnings = false
		this.syncIgnoreTrim = false
		this.syncIgnoreName = false
		this.syncIgnoreMuteConfig = false
		this.syncIgnoreLowcut = false
		this.syncIgnoreLock = false
		this.syncIgnoreLED = false
		this.syncIgnoreFrequency = false
		this.syncIgnoreCableEmulation = false
		this.syncTrim = 0
		this.syncMuteConfigTS = MuteOptionsTable.off
		this.syncMuteConfig = MuteOptions.off
		this.syncLowcut = LowcutOptions.off
		this.syncLock = false
		this.syncLED = false
		this.syncCableEmulation = false
		this.hasAes256Error = false
		this.hasAfPeakWarning = false
	}

	publishVariableValues() {
		this.parentDevice.context.setVariableValues({
			[`rx${this.index}_name`]: this.name,
			[`rx${this.index}_activeAntenna`]: this.activeAntenna,
			[`rx${this.index}_frequency`]: this.frequency,
			[`rx${this.index}_gain`]: this.gain,
			[`rx${this.index}_identification`]: this.identification,
			[`rx${this.index}_muted`]: this.muted,
			[`rx${this.index}_rsqi`]: this.rsqi,
			[`rx${this.index}_warnings`]: this.warnings,
			[`rx${this.index}_sync_ignore_trim`]: this.syncIgnoreTrim,
			[`rx${this.index}_sync_ignore_name`]: this.syncIgnoreName,
			[`rx${this.index}_sync_ignore_mute_config`]: this.syncIgnoreMuteConfig,
			[`rx${this.index}_sync_ignore_lowcut`]: this.syncIgnoreLowcut,
			[`rx${this.index}_sync_ignore_lock`]: this.syncIgnoreLock,
			[`rx${this.index}_sync_ignore_led`]: this.syncIgnoreLED,
			[`rx${this.index}_sync_ignore_frequency`]: this.syncIgnoreFrequency,
			[`rx${this.index}_sync_ignore_cable_emulation`]: this.syncIgnoreCableEmulation,
			[`rx${this.index}_sync_trim`]: this.syncTrim,
			[`rx${this.index}_sync_mute_config_ts`]: this.syncMuteConfigTS,
			[`rx${this.index}_sync_mute_config`]: this.syncMuteConfig,
			[`rx${this.index}_sync_lowcut`]: this.syncLowcut,
			[`rx${this.index}_sync_lock`]: this.syncLock,
			[`rx${this.index}_sync_led`]: this.syncLED,
			[`rx${this.index}_sync_cable_emulation`]: this.syncCableEmulation,
		})

		this.parentDevice.context.setVariableValues({
			[`tx${this.index}_batteryGauge`]: this.mate.batteryGauge,
			[`tx${this.index}_batteryLifetime`]: this.mate.batteryLifetime,
			[`tx${this.index}_batteryType`]: this.mate.batteryType,
			[`tx${this.index}_cableEmulation`]: this.mate.cableEmulation,
			[`tx${this.index}_capsule`]: this.mate.capsule,
			[`tx${this.index}_identification`]: this.mate.identification,
			[`tx${this.index}_led`]: this.mate.led,
			[`tx${this.index}_lock`]: this.mate.lock,
			[`tx${this.index}_lowcut`]: this.mate.lowcut,
			[`tx${this.index}_muted`]: this.mate.muted,
			[`tx${this.index}_name`]: this.mate.name,
			[`tx${this.index}_trim`]: this.mate.trim,
			[`tx${this.index}_type`]: this.mate.type,
		})
	}

	setMuteState(state: boolean) {
		const command = '/rx' + this.index + '/mute'
		this.parentDevice.sendCommand(command, state)
	}

	toggleMuteState() {
		const command = '/rx' + this.index + '/mute'
		this.parentDevice.sendCommand(command, !this.muted)
	}

	setMuteConfigSK(muteConfig: MuteOptions) {
		const command = '/rx' + this.index + '/sync_settings/mute_config'
		this.parentDevice.sendCommand(command, MuteOptions[muteConfig])
	}

	setMuteConfigTable(muteConfig: MuteOptionsTable) {
		const command = '/rx' + this.index + '/sync_settings/mute_config_ts'
		this.parentDevice.sendCommand(command, MuteOptionsTable[muteConfig])
	}

	setLowcut(lowcut: LowcutOptions) {
		const command = '/rx' + this.index + '/sync_settings/lowcut'
		this.parentDevice.sendCommand(command, LowcutOptions[lowcut])
	}

	setAutoLock(lock: boolean) {
		const command = '/rx' + this.index + '/sync_settings/lock'
		this.parentDevice.sendCommand(command, lock)
	}

	setTXLED(led: boolean) {
		const command = '/rx' + this.index + '/sync_settings/led'
		this.parentDevice.sendCommand(command, led)
	}

	setSyncIgnore(setting: SyncSettings, ignore: boolean) {
		const command = '/rx' + this.index + '/sync_settings/' + SyncSettings[setting]
		this.parentDevice.sendCommand(command, ignore)
	}

	setCableEmulation(mode: CableEmulationOptions) {
		const command = '/rx' + this.index + '/sync_settings/cable_emulation'
		this.parentDevice.sendCommand(command, CableEmulationOptions[mode])
	}

	setName(name: string) {
		if (name.length > 8) {
			name = name.substring(0, 8)
		}

		const command = '/rx' + this.index + '/name'
		this.parentDevice.sendCommand(command, name)
	}

	setGain(gain: number) {
		const command = '/rx' + this.index + '/gain'
		this.parentDevice.sendCommand(command, gain)
	}

	setFrequency(freq: number) {
		const command = '/rx' + this.index + '/frequency'
		this.parentDevice.sendCommand(command, freq)
	}

	setIdentification(blink: boolean) {
		const command = '/rx' + this.index + '/identification/visual'
		this.parentDevice.sendCommand(command, blink)
	}

	identify() {
		this.parentDevice.sendCommand('/rx' + this.index + '/identification/visual', true)
	}
}

function oscToJson(path: string, value: any): Record<string, any> {
	const keys = path.split('/').filter((key) => key !== '')

	const result: Record<string, any> = {}
	let currentLevel = result

	keys.forEach((key, index) => {
		currentLevel[key] = index === keys.length - 1 ? value : {}
		currentLevel = currentLevel[key]
	})

	return result
}
