import { ModuleInstance } from './main.js'
import { DeviceModel, EWDX, UNKNOWN } from './receiver.js'

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

	publishVariableValues(): void {
		console.log('Publishing Charging Bay vars')
		this.parentDevice.context.setVariableValues({
			[`bay${this.index}_update_progress`]: this.updateProgress,
			[`bay${this.index}_update`]: this.update,
			[`bay${this.index}_update_error`]: this.updateError,
			[`bay${this.index}_timeToFull`]: this.timeToFull,
			[`bay${this.index}_batCycles`]: this.batCycles,
			[`bay${this.index}_batGauge`]: this.batGauge,
			[`bay${this.index}_batHealth`]: this.batHealth,
		})
	}
}

export class CHG70N extends EWDX {
	productLabel: string
	warnings: boolean
	storageMode: boolean
	chargingBays: ChargingBay[]
	cascades: string[]

	constructor(context: ModuleInstance, host: string) {
		super(context, DeviceModel.CHG70N, host)
		this.productLabel = UNKNOWN
		this.warnings = false
		this.storageMode = false
		this.chargingBays = []
		this.cascades = []

		this.chargingBays[0] = new ChargingBay(1, this)
		this.chargingBays[1] = new ChargingBay(2, this)
	}

	getStaticInformation(): void {
		this.sendCommand('/device/identity/version', null)
		this.sendCommand('/device/identity/product', null)
	}

	publishVariableValues(): void {
		this.context.setVariableValues({
			receiver_location: this.location,
			receiver_name: this.name,
			receiver_identification: this.identification,
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
								lifetime: 60,
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
		console.log(json)

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
					console.log('ID: ' + json.device.identity.product)
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
				console.log(this.chargingBays[0].warnings)
				console.log(this.chargingBays[1].warnings)
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
			if (json.bays.bat_cylces != undefined) {
				this.chargingBays[0].batCycles = json.bays.bat_cylces[0]
				this.chargingBays[1].batCycles = json.bays.bat_cylces[1]
			}
		}

		this.context.checkFeedbacks()
		for (let i = 1; i <= this.chargingBays.length; i++) {
			this.chargingBays[i - 1].publishVariableValues()
		}
	}
}
