import { RemoteInfo } from 'dgram'
import { ModuleInstance } from './main.js'
import { InstanceStatus, SharedUdpSocket } from '@companion-module/base'

export const UNKNOWN = 'nAn'
const pollingInterval = 9000
const udpPort = 45

export enum DeviceModel {
	EM4,
	EM2,
	EM2_DANTE,
	CHG70N,
}

export class NetworkInterface {
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

	resetValues(): void {
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

/**
 * Base class for EW-DX devices containing shared properties and methods
 * This class doesn't include any protocol-specific implementation (UDP/HTTPS)
 */
export abstract class EWDXBase {
	model: DeviceModel
	context: ModuleInstance
	host: string

	name: string
	location: string
	identification: boolean
	networkInterface: NetworkInterface
	mdns: boolean

	deviceConnected: boolean

	constructor(context: ModuleInstance, model: DeviceModel, host: string) {
		this.context = context
		this.model = model
		this.host = host
		this.name = UNKNOWN
		this.location = UNKNOWN
		this.identification = false
		this.networkInterface = new NetworkInterface()
		this.mdns = false
		this.deviceConnected = false
	}

	// Abstract methods that must be implemented by protocol-specific classes
	abstract connect(): Promise<void> | void
	abstract destroy(): void
	abstract initSubscriptions(): void
	abstract publishVariableValues(): void
	abstract getStaticInformation(): void
	abstract parseMessage(json: Record<string, unknown>): void
	abstract resetAllValues(): void

	// Common methods that can be shared (but may be overridden)
	restart(): void {
		// Override in protocol-specific implementations
		throw new Error('restart() must be implemented by subclass')
	}

	setName(_name: string): void {
		// Override in protocol-specific implementations
		throw new Error('setName() must be implemented by subclass')
	}

	getName(): void {
		// Override in protocol-specific implementations
		throw new Error('getName() must be implemented by subclass')
	}

	setLocation(_location: string): void {
		// Override in protocol-specific implementations
		throw new Error('setLocation() must be implemented by subclass')
	}

	setIdentification(_identification: boolean): void {
		// Override in protocol-specific implementations
		throw new Error('setIdentification() must be implemented by subclass')
	}

	setNetworkSettings(_dhcp: boolean, _mdns: boolean, _ip: string, _netmask: string, _gateway: string): void {
		// Override in protocol-specific implementations
		throw new Error('setNetworkSettings() must be implemented by subclass')
	}
}

/**
 * SCPv1 (UDP-based) implementation for EW-DX devices with firmware < 4.0.0
 */
export abstract class EWDX extends EWDXBase {
	private socket: SharedUdpSocket
	private responseTimeout?: NodeJS.Timeout

	constructor(context: ModuleInstance, model: DeviceModel, host: string) {
		super(context, model, host)

		this.socket = context.createSharedUdpSocket('udp4', (msg, rinfo) => this.checkMessage(msg, rinfo))

		this.setupListeners()

		this.initSubscriptions()

		setTimeout(() => {
			this.getStaticInformation()
		}, 1000)

		setInterval(() => {
			this.initSubscriptions()
			this.getStaticInformation()
		}, pollingInterval)

		// Pinging the device every 5 seconds to make sure it did not went offline
		setInterval(() => {
			this.getName()
		}, 5000)
	}

	checkMessage(raw: Uint8Array, rinfo: RemoteInfo): void {
		if (rinfo.address == this.host && rinfo.port == udpPort) {
			const message = Buffer.from(raw).toString()
			console.log(message)
			const json = JSON.parse(message) as Record<string, unknown>
			if (json) {
				this.parseMessage(json)
			} else {
				console.debug('Error parsing received message from device.')
			}

			if (this.deviceConnected == false) {
				this.deviceConnected = true
				this.context.updateStatus(InstanceStatus.Ok)
			}

			if (this.responseTimeout) {
				clearTimeout(this.responseTimeout)
				this.responseTimeout = undefined
			}
		}
	}

	public sendCommand(path: string, value: boolean | number | string | object | null): void {
		const cmd = oscToJson(path, value)
		const message = JSON.stringify(cmd)
		this.sendMessage(message)
		console.log('debug', `Sending command: ${message}`)
	}

	public sendMessage(message: string): void {
		this.socket.send(message, udpPort, this.host)
		if (this.responseTimeout) {
			clearTimeout(this.responseTimeout)
		}
		this.responseTimeout = setTimeout(() => {
			this.resetAllValues()
			this.deviceConnected = false
			this.context.checkFeedbacks()
			this.context.updateStatus(
				InstanceStatus.Disconnected,
				'Device not responding - make sure its connected and turned on.',
			)
		}, 2000)
	}

	private setupListeners() {
		this.socket.bind(udpPort, this.host, () => {
			console.log('Socket successfully connected.')
		})

		this.socket.on('error', (err) => {
			console.error('Socket error:', err)
		})

		this.socket.on('close', () => {
			console.log('Socket closed!')
		})
	}

	// Override base class methods with UDP/SCPv1 implementations
	override restart(): void {
		this.sendCommand('/device/restart', true)
	}

	override setName(name: string): void {
		this.sendCommand('/device/name', name)
	}

	override getName(): void {
		this.sendCommand('/device/name', null)
	}

	override setLocation(location: string): void {
		this.sendCommand('/device/location', location)
	}

	override setIdentification(identification: boolean): void {
		this.sendCommand('/device/identification/visual', identification)
	}

	override setNetworkSettings(dhcp: boolean, mdns: boolean, ip: string, netmask: string, gateway: string): void {
		this.sendCommand('/device/network/ipv4/auto', dhcp)
		this.sendCommand('/device/network/mdns', mdns)
		if (ip != '' && ip != null) this.sendCommand('/device/network/ipv4/manual_ipaddr', ip)
		if (netmask != '' && netmask != null) this.sendCommand('/device/network/ipv4/manual_netmask', netmask)
		if (gateway != '' && gateway != null) this.sendCommand('/device/network/ipv4/manual_gateway', gateway)
	}

	// Abstract methods that must be implemented by EWDXReceiver
	abstract initSubscriptions(): void
	abstract publishVariableValues(): void
	abstract getStaticInformation(): void
	abstract parseMessage(json: Record<string, unknown>): void
	abstract resetAllValues(): void
	abstract destroy(): void
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
