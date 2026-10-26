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

export abstract class EWDX {
	private socket: SharedUdpSocket
	model: DeviceModel
	context: ModuleInstance
	host: string

	name: string
	location: string
	identification: boolean
	networkInterface: NetworkInterface
	mdns: boolean

	deviceConnected: boolean
	private responseTimeout?: NodeJS.Timeout
	private readonly pendingTimeouts = new Set<NodeJS.Timeout>()
	private pollingTimer: NodeJS.Timeout
	private pingTimer: NodeJS.Timeout
	private destroyed = false
	private socketReady = false

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

		this.socket = context.createSharedUdpSocket('udp4', (msg, rinfo) => this.checkMessage(msg, rinfo))

		this.setupListeners()

		this.initSubscriptions()

		this.scheduleTimeout(() => {
			this.getStaticInformation()
		}, 1000)

		this.pollingTimer = setInterval(() => {
			this.initSubscriptions()
			this.getStaticInformation()
		}, pollingInterval)

		// Pinging the device every 5 seconds to make sure it did not went offline
		this.pingTimer = setInterval(() => {
			this.getName()
		}, 5000)
	}

	protected scheduleTimeout(callback: () => void, delay: number): void {
		if (this.destroyed) return
		const timeout = setTimeout(() => {
			this.pendingTimeouts.delete(timeout)
			if (!this.destroyed) callback()
		}, delay)
		this.pendingTimeouts.add(timeout)
	}

	destroy(): void {
		if (this.destroyed) return
		this.destroyed = true
		clearInterval(this.pollingTimer)
		clearInterval(this.pingTimer)
		for (const timeout of this.pendingTimeouts) clearTimeout(timeout)
		this.pendingTimeouts.clear()
		clearTimeout(this.responseTimeout)
		this.responseTimeout = undefined
		this.deviceConnected = false
		// A socket still binding will be closed by its listening callback.
		if (this.socketReady) this.closeSocket()
	}

	private closeSocket(): void {
		this.socketReady = false
		try {
			this.socket.close()
		} catch (err) {
			this.context.log('debug', `Socket could not be closed: ${String(err)}`)
		}
	}

	checkMessage(raw: Uint8Array, rinfo: RemoteInfo): void {
		if (!this.destroyed && rinfo.address == this.host && rinfo.port == udpPort) {
			const message = Buffer.from(raw).toString()
			let json: unknown
			try {
				json = JSON.parse(message)
			} catch (err) {
				this.context.log('warn', `Error parsing received message from device: ${String(err)}`)
				return
			}
			if (json === null || typeof json !== 'object' || Array.isArray(json)) {
				this.context.log('warn', 'Received message from device is not a JSON object.')
				return
			}
			this.parseMessage(json)

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
		this.context.log('debug', `Sending command: ${message}`)
	}

	public sendMessage(message: string): void {
		if (this.destroyed || !this.socketReady) return
		try {
			this.socket.send(message, udpPort, this.host)
		} catch (err) {
			this.handleSocketError(err instanceof Error ? err : new Error(String(err)))
			return
		}
		if (this.responseTimeout) {
			clearTimeout(this.responseTimeout)
		}
		this.responseTimeout = setTimeout(() => {
			this.responseTimeout = undefined
			this.resetAllValues()
			this.deviceConnected = false
			this.context.checkAllFeedbacks()
			this.context.updateStatus(
				InstanceStatus.Disconnected,
				'Device not responding - make sure its connected and turned on.',
			)
		}, 2000)
	}

	private handleSocketError(err: Error): void {
		if (this.destroyed) return
		this.context.log('error', `Socket error: ${err.message}`)
		clearTimeout(this.responseTimeout)
		this.responseTimeout = undefined
		this.deviceConnected = false
		this.resetAllValues()
		this.context.checkAllFeedbacks()
		this.context.updateStatus(InstanceStatus.ConnectionFailure, err.message)
	}

	private setupListeners() {
		this.socket.on('error', (err) => this.handleSocketError(err))

		this.socket.on('close', () => {
			this.socketReady = false
			this.context.log('debug', 'Socket closed!')
		})

		this.socket.bind(0, this.host, () => {
			this.socketReady = true
			if (this.destroyed) {
				this.closeSocket()
				return
			}
			this.context.log('debug', 'Socket successfully connected.')
		})
	}

	restart(): void {
		this.sendCommand('/device/restart', true)
	}

	setName(name: string): void {
		this.sendCommand('/device/name', name)
	}

	getName(): void {
		this.sendCommand('/device/name', null)
	}

	setLocation(location: string): void {
		this.sendCommand('/device/location', location)
	}

	setIdentification(identification: boolean): void {
		this.sendCommand('/device/identification/visual', identification)
	}

	setNetworkSettings(dhcp: boolean, mdns: boolean, ip: string, netmask: string, gateway: string): void {
		this.sendCommand('/device/network/ipv4/auto', dhcp)
		this.sendCommand('/device/network/mdns', mdns)
		if (ip != '' && ip != null) this.sendCommand('/device/network/ipv4/manual_ipaddr', ip)
		if (netmask != '' && netmask != null) this.sendCommand('/device/network/ipv4/manual_netmask', netmask)
		if (gateway != '' && gateway != null) this.sendCommand('/device/network/ipv4/manual_gateway', gateway)
	}

	abstract initSubscriptions(): void
	abstract publishVariableValues(): void
	abstract getStaticInformation(): void
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	abstract parseMessage(json: any): void
	abstract resetAllValues(): void
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
