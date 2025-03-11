import { CableEmulationOptions, LowcutOptions, MuteOptions } from './ewdxReceiver.js'
import { ModuleInstance } from './main.js'
import { DeviceModel, EWDX, UNKNOWN } from './ewdx.js'

export enum ChargingDevice {
	'EW-DX SK',
	'EW-DX SK 3-pin',
	'EW-DX SKM',
	'EW-DX SKM-S',
	'BA70',
	'NONE',
	'UNKNOWN',
}

export enum ChargingBayState {
	NORMAL,
	UPDATE,
	ERROR,
	DFU_MODE,
}

export enum ChargingBayWarnings {
	BatteryComError,
	BatteryNotChargeable,
	BatteryNotDischargeable,
	OvercurrentDetected,
	BatteryTempOutOfRange,
}

class ChargingBay {
	parentDevice: CHG70N
	index: number
	update: false
	updateProgress: number
	updateError: string
	warnings: ChargingBayWarnings[]
	txVersion: string
	txSerial: string
	chargingDevice: ChargingDevice
	syncError: boolean
	state: ChargingBayState
	identification: boolean
	timeToFull: number
	batHealth: number
	batGauge: number
	batCycles: number

	constructor(index: number, parentDevice: CHG70N) {
		this.parentDevice = parentDevice
		this.index = index
		this.update = false
		this.updateProgress = 0
		this.updateError = UNKNOWN
		this.warnings = []
		this.txVersion = UNKNOWN
		this.txSerial = UNKNOWN
		this.chargingDevice = ChargingDevice.UNKNOWN
		this.syncError = false
		this.state = ChargingBayState.ERROR
		this.identification = false
		this.timeToFull = 0
		this.batHealth = 0
		this.batGauge = 0
		this.batCycles = 0
	}

	resetValues() {
		this.update = false
		this.updateProgress = 0
		this.updateError = UNKNOWN
		this.warnings = []
		this.txVersion = UNKNOWN
		this.txSerial = UNKNOWN
		this.chargingDevice = ChargingDevice.UNKNOWN
		this.syncError = false
		this.state = ChargingBayState.ERROR
		this.identification = false
		this.timeToFull = 0
		this.batHealth = 0
		this.batGauge = 0
		this.batCycles = 0
	}

	publishVariableValues(): void {
		this.parentDevice.context.setVariableValues({
			[`bay${this.index}_update_progress`]: this.updateProgress,
			[`bay${this.index}_update`]: this.update,
			[`bay${this.index}_update_error`]: this.updateError,
			[`bay${this.index}_timeToFull`]: this.timeToFull,
			[`bay${this.index}_batCycles`]: this.batCycles,
			[`bay${this.index}_batGauge`]: this.batGauge,
			[`bay${this.index}_batHealth`]: this.batHealth,
			[`bay${this.index}_chargingDevice`]: ChargingDevice[this.chargingDevice],
			[`bay${this.index}_txSerial`]: this.txSerial,
			[`bay${this.index}_txVersion`]: this.txVersion,
			[`bay${this.index}_identification`]: this.identification,
			[`bay${this.index}_state`]: ChargingBayState[this.state],
			[`bay${this.index}_warnings`]: this.warnings.map((w) => ChargingBayWarnings[w]).join(', '),
			[`bay${this.index}_syncError`]: this.syncError,
		})
	}

	setIdentify(identify: boolean): void {
		const identifyArray: (boolean | null)[] = Array(2).fill(null)
		identifyArray[this.index - 1] = identify

		const msg = {
			bays: {
				identify: identifyArray,
			},
		}

		this.parentDevice.sendMessage(JSON.stringify(msg))
	}

	setName(name: string): void {
		if (name.length > 8) {
			name = name.substring(0, 8)
		}
		const msg = {
			bays: {
				sync_settings: [
					{
						bay_id: this.index - 1,
						name: name,
					},
				],
			},
		}
		this.parentDevice.sendMessage(JSON.stringify(msg))
	}

	setMuteConfig(mute: MuteOptions): void {
		const msg = {
			bays: {
				sync_settings: [
					{
						bay_id: this.index - 1,
						mute_config: MuteOptions[mute],
					},
				],
			},
		}
		this.parentDevice.sendMessage(JSON.stringify(msg))
	}
	setCableEmulation(emulation: CableEmulationOptions): void {
		const msg = {
			bays: {
				sync_settings: [
					{
						bay_id: this.index - 1,
						cable_emulation: CableEmulationOptions[emulation],
					},
				],
			},
		}
		this.parentDevice.sendMessage(JSON.stringify(msg))
	}
	setTxLED(led: boolean): void {
		const msg = {
			bays: {
				sync_settings: [
					{
						bay_id: this.index - 1,
						led: led,
					},
				],
			},
		}
		this.parentDevice.sendMessage(JSON.stringify(msg))
	}
	setAutoLock(lock: boolean): void {
		const msg = {
			bays: {
				sync_settings: [
					{
						bay_id: this.index - 1,
						lock: lock,
					},
				],
			},
		}
		this.parentDevice.sendMessage(JSON.stringify(msg))
	}
	setLowcut(lowcut: LowcutOptions): void {
		const msg = {
			bays: {
				sync_settings: [
					{
						bay_id: this.index - 1,
						lowcut: LowcutOptions[lowcut],
					},
				],
			},
		}
		this.parentDevice.sendMessage(JSON.stringify(msg))
	}
	setLinkDensityMode(density: boolean): void {
		const msg = {
			bays: {
				sync_settings: [
					{
						bay_id: this.index - 1,
						link_density_mode: density,
					},
				],
			},
		}
		this.parentDevice.sendMessage(JSON.stringify(msg))
	}
	setFrequency(freq: number): void {
		const msg = {
			bays: {
				sync_settings: [
					{
						bay_id: this.index - 1,
						frequency: freq,
					},
				],
			},
		}
		this.parentDevice.sendMessage(JSON.stringify(msg))
	}
	setTrim(trim: number): void {
		const msg = {
			bays: {
				sync_settings: [
					{
						bay_id: this.index - 1,
						trim: trim,
					},
				],
			},
		}
		this.parentDevice.sendMessage(JSON.stringify(msg))
	}
}

export class CHG70N extends EWDX {
	productLabel: string
	version: string
	warnings: boolean
	storageMode: boolean
	chargingBays: ChargingBay[]
	cascades: string[]

	constructor(context: ModuleInstance, host: string) {
		super(context, DeviceModel.CHG70N, host)
		this.productLabel = UNKNOWN
		this.version = UNKNOWN
		this.warnings = false
		this.storageMode = false
		this.chargingBays = []
		this.cascades = []

		this.chargingBays[0] = new ChargingBay(1, this)
		this.chargingBays[1] = new ChargingBay(2, this)
	}

	resetAllValues(): void {
		this.resetValues()
		for (let i = 0; i <= 1; i++) {
			this.chargingBays[i].resetValues()
			this.chargingBays[i].publishVariableValues()
		}
	}

	resetValues(): void {
		this.productLabel = UNKNOWN
		this.version = UNKNOWN
		this.warnings = false
		this.storageMode = false
		this.cascades = []
	}

	getStaticInformation(): void {
		this.sendCommand('/device/identity/version', null)
		this.sendCommand('/device/identity/product', null)
	}

	publishVariableValues(): void {
		this.context.setVariableValues({
			device_location: this.location,
			device_name: this.name,
			device_identification: this.identification,
			device_storagemode: this.storageMode,
			device_productlabel: this.productLabel,
			device_version: this.version,
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

	initSubscriptions(): void {
		const msgNetwork = {
			osc: {
				state: {
					subscribe: [
						{
							'#': {
								lifetime: 10,
							},
							device: {
								identification: {
									visual: null,
								},
								network: {
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
								warnings: null,
								storage_mode: null,
								name: null,
								location: null,
								cascade: null,
							},
						},
					],
				},
			},
		}
		setTimeout(() => {
			this.sendMessage(JSON.stringify(msgNetwork))
		}, 1000)

		const msgBays = {
			osc: {
				state: {
					subscribe: [
						{
							'#': {
								lifetime: 60,
							},
							bays: {
								update: {
									progress: null,
									error: null,
									enable: true,
								},
								warnings: null,
								version: null,
								sync_error: null,
								state: null,
								serial: null,
								identify: null,
								device_type: null,
								bat_timetofull: null,
								bat_health: null,
								bat_gauge: null,
								bat_cycles: null,
							},
						},
					],
				},
			},
		}
		setTimeout(() => {
			this.sendMessage(JSON.stringify(msgBays))
		}, 1000)
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	parseMessage(json: any): void {
		if (json.device) {
			if (json.device.name != undefined) {
				this.name = json.device.name
			}
			if (json.device.location != undefined) {
				this.location = json.device.location
			}
			if (json.device.identification != undefined) {
				if (json.device.identification.visual != undefined) {
					this.identification = json.device.identification.visual
				}
			}
			if (json.device.identity != undefined) {
				if (json.device.identity.product != undefined) {
					this.productLabel = json.device.identity.product
				}
				if (json.device.identity.version != undefined) {
					this.version = json.device.identity.version
				}
			}
			if (json.device.storage_mode != undefined) {
				this.storageMode = json.device.storage_mode
			}
			if (json.device.cascade != undefined) {
				this.cascades = json.device.cascade
			}
			if (json.device.warnings != undefined) {
				if (json.device.warnings == '') {
					this.warnings = false
				} else this.warnings = true
			}
			if (json.device.network != undefined) {
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
		if (json.bays) {
			if (json.bays.update != undefined) {
				if (json.bays.update.progress != undefined) {
					this.chargingBays[0].updateProgress = json.bays.update.progress[0]
					this.chargingBays[1].updateProgress = json.bays.update.progress[1]
				}
				if (json.bays.update.error != undefined) {
					this.chargingBays[0].updateError = json.bays.update.error[0]
					this.chargingBays[1].updateError = json.bays.update.error[1]
				}
				if (json.bays.update.enable != undefined) {
					this.chargingBays[0].update = json.bays.update.enable[0]
					this.chargingBays[1].update = json.bays.update.enable[1]
				}
			}
			if (json.bays.warnings !== undefined) {
				this.chargingBays[0].warnings = []
				this.chargingBays[1].warnings = []

				if (json.bays.warnings !== undefined) {
					json.bays.warnings.forEach((bayWarnings: any, index: any) => {
						this.chargingBays[index].warnings = bayWarnings.map(
							(warning: string) => ChargingBayWarnings[warning as keyof typeof ChargingBayWarnings],
						)
					})
				}
			}
			if (json.bays.version != undefined) {
				this.chargingBays[0].txVersion = json.bays.version[0]
				this.chargingBays[1].txVersion = json.bays.version[1]
			}
			if (json.bays.serial != undefined) {
				this.chargingBays[0].txSerial = json.bays.serial[0]
				this.chargingBays[1].txSerial = json.bays.serial[1]
			}
			if (json.bays.sync_error != undefined) {
				this.chargingBays[0].syncError = json.bays.sync_error[0] == '' ? false : true
				this.chargingBays[1].syncError = json.bays.sync_error[1] == '' ? false : true
			}
			if (json.bays.state != undefined) {
				this.chargingBays[0].state = ChargingBayState[json.bays.state[0] as keyof typeof ChargingBayState]
				this.chargingBays[1].state = ChargingBayState[json.bays.state[1] as keyof typeof ChargingBayState]
			}
			if (json.bays.identify != undefined) {
				this.chargingBays[0].identification = json.bays.identify[0]
				this.chargingBays[1].identification = json.bays.identify[1]
			}
			if (json.bays.device_type != undefined) {
				this.chargingBays[0].chargingDevice = ChargingDevice[json.bays.device_type[0] as keyof typeof ChargingDevice]
				this.chargingBays[1].chargingDevice = ChargingDevice[json.bays.device_type[1] as keyof typeof ChargingDevice]
			}
			if (json.bays.bat_timetofull != undefined) {
				this.chargingBays[0].timeToFull = json.bays.bat_timetofull[0]
				this.chargingBays[1].timeToFull = json.bays.bat_timetofull[1]
			}
			if (json.bays.bat_health != undefined) {
				this.chargingBays[0].batHealth = json.bays.bat_health[0]
				this.chargingBays[1].batHealth = json.bays.bat_health[1]
			}
			if (json.bays.bat_gauge != undefined) {
				this.chargingBays[0].batGauge = json.bays.bat_gauge[0]
				this.chargingBays[1].batGauge = json.bays.bat_gauge[1]
			}
			if (json.bays.bat_cycles != undefined) {
				this.chargingBays[0].batCycles = json.bays.bat_cycles[0]
				this.chargingBays[1].batCycles = json.bays.bat_cycles[1]
			}
		}

		this.context.checkFeedbacks()
		for (let i = 1; i <= this.chargingBays.length; i++) {
			this.chargingBays[i - 1].publishVariableValues()
		}
	}
}
