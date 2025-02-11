import { RemoteInfo } from 'dgram'
import { ModuleInstance } from './main.js'
import { SharedUdpSocket } from '@companion-module/base'

export const UNKNOWN = 'nAn'
const pollingInterval = 59000

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

	constructor(context: ModuleInstance, model: DeviceModel, host: string) {
		this.context = context
		this.model = model
		this.host = host
		this.name = UNKNOWN
		this.location = UNKNOWN
		this.identification = false
		this.networkInterface = new NetworkInterface()
		this.mdns = false

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
	}

	checkMessage(raw: Uint8Array, rinfo: RemoteInfo): void {
		//rinfo.port == 45
		if (rinfo.address == this.host) {
			const message = Buffer.from(raw).toString()

			const json: JSON = JSON.parse(message)
			this.parseMessage(json)
		}
	}

	public sendCommand(path: string, value: boolean | number | string | object | null): void {
		const cmd = oscToJson(path, value)
		const message = JSON.stringify(cmd)
		this.sendMessage(message)
	}

	public sendMessage(message: string): void {
		this.socket.send(message, 4545, this.host)
	}

	private setupListeners() {
		this.socket.bind(45, this.host, () => {
			console.log('Socket successfully connected.')
		})

		this.socket.on('error', (err) => {
			console.error('Socket error:', err)
		})

		this.socket.on('close', () => {
			console.log('Socket closed!')
		})
	}

	restart(): void {
		this.sendCommand('/device/restart', true)
	}

	setName(name: string): void {
		this.sendCommand('/device/name', name)
	}

	setLocation(location: string): void {
		this.sendCommand('/device/location', location)
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
