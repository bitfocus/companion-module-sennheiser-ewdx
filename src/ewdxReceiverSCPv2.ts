import axios, { AxiosInstance } from 'axios'
import { Agent } from 'https'
import { InstanceStatus } from '@companion-module/base'
import { EWDXBase, DeviceModel, UNKNOWN } from './ewdx.js'
import type { ModuleInstance } from './main.js'

interface HTTPClient {
	get<T = any>(path: string): Promise<T>
	put<T = any>(path: string, data?: any): Promise<T>
	delete<T = any>(path: string): Promise<T>
}

/**
 * SCPv2 implementation for EW-DX firmware >= 4.0.0
 * Uses HTTPS REST API with SSE for real-time updates
 */
export class EWDXReceiverSCPv2 extends EWDXBase {
	private baseUrl: string
	private auth: string
	private sseStream: any = null
	private reconnectTimer: NodeJS.Timeout | null = null
	private reconnectAttempts: number = 0
	private maxReconnectAttempts: number = 10
	private heartbeatTimer: NodeJS.Timeout | null = null
	private httpClient: HTTPClient
	private axiosInstance: AxiosInstance
	private sessionUUID: string | null = null

	// Properties to maintain compatibility with SCPv1 interface
	public encryption: boolean = false
	public linkDensityMode: boolean = false
	public brightness: number = 3
	public autoLock: boolean = false
	public frequencyCode: string = ''

	// Channel properties to match SCPv1 structure
	public channels: Array<{
		name: string
		muted: boolean
		gain: number
		frequency: number
		identification: boolean
		activeAntenna: number
		rsqi: number
		hasAfPeakWarning: boolean
		hasAes256Error: boolean
		warnings: boolean

		// Sync settings properties
		syncIgnoreTrim: boolean
		syncIgnoreName: boolean
		syncIgnoreMuteConfig: boolean
		syncIgnoreLowcut: boolean
		syncIgnoreLock: boolean
		syncIgnoreLED: boolean
		syncIgnoreFrequency: boolean
		syncIgnoreCableEmulation: boolean

		// Transmitter/mate properties
		mate: {
			batteryGauge: number
			batteryType: string
			batteryLifetime: number
			muteConfig: number
			muted: boolean
		}

		// Methods to maintain compatibility
		setMuteState: (muted: boolean) => Promise<void>
		toggleMuteState: () => Promise<void>
		setName: (name: string) => Promise<void>
		setGain: (gain: number) => Promise<void>
		setFrequency: (frequency: number) => Promise<void>
		setIdentification: (identify: boolean) => Promise<void>
		setMuteConfigSK: (config: number) => Promise<void>
		setMuteConfigTable: (config: number) => Promise<void>
		setSyncIgnore: (setting: number, ignore: boolean) => Promise<void>
		setLowcut: (lowcut: number) => Promise<void>
		setAutoLock: (lock: boolean) => Promise<void>
		setTrim: (trim: number) => Promise<void>
		setTXLED: (enabled: boolean) => Promise<void>
		setCableEmulation: (emulation: number) => Promise<void>
	}> = []

	constructor(context: ModuleInstance, model: DeviceModel, host: string, thirdPartyPassword: string) {
		super(context, model, host)

		// Set initial status to Connecting when module starts
		this.context.updateStatus(InstanceStatus.Connecting)

		console.log(`[SCPv2] Initializing SCPv2 receiver for ${model} at ${host}`)
		this.baseUrl = `https://${host}`
		this.auth = Buffer.from(`api:${thirdPartyPassword}`).toString('base64')
		console.log(`[SCPv2] Base URL: ${this.baseUrl}`)
		console.log(`[SCPv2] Authentication configured for 'api' user`)

		// Initialize channels array based on model
		const maxChannels = model === DeviceModel.EM4 ? 4 : 2
		console.log(`[SCPv2] Initializing ${maxChannels} channels for ${model}`)
		this.initializeChannels(maxChannels)

		// Create axios instance with proper SSL configuration for self-signed certificates
		this.axiosInstance = axios.create({
			baseURL: this.baseUrl,
			timeout: 10000,
			headers: {
				Authorization: `Basic ${this.auth}`,
				'Content-Type': 'application/json',
			},
			// Allow self-signed certificates
			httpsAgent: new Agent({
				rejectUnauthorized: false,
				checkServerIdentity: () => undefined,
			}),
		})

		// Create HTTP client wrapper
		this.httpClient = {
			get: async <T = any>(path: string): Promise<T> => {
				console.log(`[SCPv2] HTTP GET: ${path}`)
				try {
					const response = await this.axiosInstance.get(path)
					console.log(`[SCPv2] HTTP GET ${path} - Status: ${response.status}`)
					return response.data
				} catch (error) {
					console.log(`[SCPv2] HTTP GET ${path} - Error:`, error)
					throw error
				}
			},

			put: async <T = any>(path: string, data?: any): Promise<T> => {
				console.log(`[SCPv2] HTTP PUT: ${path}`, data ? JSON.stringify(data) : '(no body)')
				try {
					const response = await this.axiosInstance.put(path, data)
					console.log(`[SCPv2] HTTP PUT ${path} - Status: ${response.status}`)
					return response.data
				} catch (error) {
					console.log(`[SCPv2] HTTP PUT ${path} - Error:`, error)
					throw error
				}
			},

			delete: async <T = any>(path: string): Promise<T> => {
				console.log(`[SCPv2] HTTP DELETE: ${path}`)
				try {
					const response = await this.axiosInstance.delete(path)
					console.log(`[SCPv2] HTTP DELETE ${path} - Status: ${response.status}`)
					return response.data
				} catch (error) {
					console.log(`[SCPv2] HTTP DELETE ${path} - Error:`, error)
					throw error
				}
			},
		}
	}

	private initializeChannels(maxChannels: number): void {
		console.log(`[SCPv2] Initializing ${maxChannels} channels with compatibility structure`)
		this.channels = Array.from({ length: maxChannels }, (_, i) => {
			console.log(`[SCPv2] Creating channel ${i + 1} with default values and method bindings`)
			return {
				name: `Channel ${i + 1}`,
				muted: false,
				gain: 0,
				frequency: 470200,
				identification: false,
				activeAntenna: 1,
				rsqi: 0,
				hasAfPeakWarning: false,
				hasAes256Error: false,
				warnings: false,

				// Sync settings properties
				syncIgnoreTrim: false,
				syncIgnoreName: false,
				syncIgnoreMuteConfig: false,
				syncIgnoreLowcut: false,
				syncIgnoreLock: false,
				syncIgnoreLED: false,
				syncIgnoreFrequency: false,
				syncIgnoreCableEmulation: false,

				// Transmitter/mate properties
				mate: {
					batteryGauge: 0,
					batteryType: 'Unknown',
					batteryLifetime: 0,
					muteConfig: 0,
					muted: false,
				},

				// Methods to maintain compatibility with SCPv1 interface
				setMuteState: async (muted: boolean) => await this.setChannelMute(i, muted),
				toggleMuteState: async () => await this.setChannelMute(i, !this.channels[i].muted),
				setName: async (name: string) => await this.setChannelName(i, name),
				setGain: async (gain: number) => await this.setChannelGain(i, gain),
				setFrequency: async (frequency: number) => await this.setChannelFrequency(i, frequency),
				setIdentification: async (identify: boolean) => await this.setChannelIdentify(i, identify),
				setMuteConfigSK: async (config: number) => {
					const configMap = ['Off', 'RfMute', 'AfMute']
					await this.setMuteConfigSK(i, configMap[config] as 'Off' | 'RfMute' | 'AfMute')
				},
				setMuteConfigTable: async (config: number) => {
					const configMap = ['Off', 'AfMute', 'PTT', 'PTM']
					await this.setMuteConfigTable(i, configMap[config] as 'AfMute' | 'Off' | 'PTT' | 'PTM')
				},
				setSyncIgnore: async (setting: number, ignore: boolean) => {
					const settingNames = [
						'trim_ignore',
						'name_ignore',
						'mute_config_ignore',
						'lowcut_ignore',
						'lock_ignore',
						'led_ignore',
						'frequency_ignore',
						'cable_emulation_ignore',
					]
					await this.setSyncIgnore(i, settingNames[setting], ignore)
				},
				setLowcut: async (lowcut: number) => {
					const lowcutMap = ['Off', '30Hz', '60Hz', '80Hz', '100Hz', '120Hz']
					await this.setLowcut(i, lowcutMap[lowcut] as 'Off' | '30Hz' | '60Hz' | '80Hz' | '100Hz' | '120Hz')
				},
				setAutoLock: async (lock: boolean) => await this.setAutoLock(i, lock),
				setTrim: async (trim: number) => await this.setTrim(i, trim),
				setTXLED: async (enabled: boolean) => await this.setTXLED(i, enabled),
				setCableEmulation: async (emulation: number) => {
					const emulationMap = ['Off', 'Type1', 'Type2', 'Type3']
					await this.setCableEmulation(i, emulationMap[emulation] as 'Off' | 'Type1' | 'Type2' | 'Type3')
				},
			}
		})
		console.log(`[SCPv2] Channel initialization completed`)

		// Start connection to device after initialization
		setTimeout(() => {
			console.log(`[SCPv2] Starting connection to device...`)
			this.connect().catch((error) => {
				console.log(`[SCPv2] Initial connection failed:`, error)
				console.log(`[SCPv2] Will retry automatically...`)
			})
		}, 1000)
	}

	private updateVariable(name: string, value: any): void {
		this.context.setVariableValues({ [name]: value })
	}

	private logError(message: string, error: Error): void {
		console.log('error', `${message}: ${error.message}`)
	}

	async connect(): Promise<void> {
		try {
			// Update status to show connection is being attempted
			this.context.updateStatus(InstanceStatus.Connecting)

			console.log(`[SCPv2] Connecting to EW-DX device at ${this.baseUrl}...`)
			console.log(`[SCPv2] Device model: ${this.model}, Expected channels: ${this.model === DeviceModel.EM4 ? 4 : 2}`)

			// Test connection with device identity
			console.log(`[SCPv2] Testing connection with device identity...`)
			const identity = await this.httpClient.get('/api/device/identity')
			console.log(`[SCPv2] Device identity response:`, identity)

			this.deviceConnected = true
			console.log(`[SCPv2] Connection established successfully`)

			// Reset reconnection attempts on successful connection
			this.reconnectAttempts = 0

			// Update Companion status to show connection is OK
			this.context.updateStatus(InstanceStatus.Ok)

			// Start SSE subscription for real-time updates (SCPv2 gets all data via subscriptions)
			console.log(`[SCPv2] Starting SSE subscription for real-time updates...`)
			await this.startSubscription()

			// Start heartbeat to keep connection alive
			this.startHeartbeat()

			console.log(`[SCPv2] Connection flow completed successfully`)
		} catch (error) {
			console.log(`[SCPv2] Connection failed: ${error}`)
			if (error instanceof Error) {
				console.log(`[SCPv2] Error details: ${error.message}`)
				console.log(`[SCPv2] Error stack: ${error.stack}`)
			}
			this.deviceConnected = false

			// Update Companion status to show connection failed
			this.context.updateStatus(InstanceStatus.ConnectionFailure, `Connection failed: ${error}`)

			throw error
		}
	}

	private async startSubscription(): Promise<void> {
		try {
			console.log(`[SCPv2] Starting subscription according to SSCv2 protocol...`)

			// Step 1: Start subscription with GET /api/ssc/state/subscriptions
			// This returns a text/event-stream with sessionUUID in the initial message
			console.log(`[SCPv2] GET /api/ssc/state/subscriptions to start subscription stream...`)

			const sseUrl = `/api/ssc/state/subscriptions`
			console.log(`[SCPv2] Connecting to SSE endpoint: ${this.baseUrl}${sseUrl}`)

			// Use axios stream instead of EventSource for authentication compatibility
			console.log(`[SCPv2] Using axios stream for SSE connection with proper authentication...`)

			const response = await this.axiosInstance.get(sseUrl, {
				responseType: 'stream',
				headers: {
					Accept: 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
					'X-Requested-With': 'XMLHttpRequest',
				},
				// Increase timeout for long-running SSE connections
				timeout: 0, // No timeout for streaming connections
				// Keep connection alive
				httpsAgent: new Agent({
					keepAlive: true,
					keepAliveMsecs: 30000, // 30 seconds
					maxSockets: 1,
					maxFreeSockets: 1,
					rejectUnauthorized: false,
					checkServerIdentity: () => undefined,
				}),
			})

			console.log(`[SCPv2] SSE stream response status: ${response.status}`)
			console.log(`[SCPv2] SSE stream response headers:`, response.headers)

			// Store stream reference for cleanup
			this.sseStream = response.data

			// Parse the SSE stream manually
			let buffer = ''
			let connectionEstablished = false

			response.data.on('data', async (chunk: Buffer) => {
				buffer += chunk.toString()
				const lines = buffer.split('\n')
				buffer = lines.pop() || '' // Keep incomplete line in buffer

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.substring(6)
						console.log(`[SCPv2] Received SSE data:`, data)

						try {
							const parsed = JSON.parse(data)

							// Check if this is the initial sessionUUID message
							if (parsed.sessionUUID && parsed.path && !connectionEstablished) {
								this.sessionUUID = parsed.sessionUUID
								console.log(`[SCPv2] Got sessionUUID: ${this.sessionUUID}`)
								console.log(`[SCPv2] Session path: ${parsed.path}`)

								// Now subscribe to resources using PUT request
								await this.subscribeToResources()
								connectionEstablished = true
								console.log(`[SCPv2] Initial subscription completed, now listening for updates...`)
								return
							}

							// Handle other SSE messages here
							this.handleSSEMessage(parsed)
						} catch (error) {
							console.log(`[SCPv2] Failed to parse SSE data: ${error}`)
						}
					}
				}
			})

			response.data.on('error', (error: Error) => {
				const errorCode = (error as any).code
				console.log(`[SCPv2] SSE stream error (will attempt reconnection): ${error}`)
				console.log(`[SCPv2] Error code: ${errorCode}`)

				// Check if this is a recoverable error
				const recoverableErrors = ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE']
				if (recoverableErrors.includes(errorCode)) {
					console.log(`[SCPv2] Error ${errorCode} is recoverable, scheduling reconnection...`)
				} else {
					console.log(`[SCPv2] Unexpected error ${errorCode}, will still attempt reconnection...`)
				}

				this.scheduleReconnection()
			})

			response.data.on('end', () => {
				console.log(`[SCPv2] SSE stream ended (server closed connection)`)
				this.scheduleReconnection()
			})

			response.data.on('close', () => {
				console.log(`[SCPv2] SSE stream closed`)
				this.scheduleReconnection()
			})

			// Keep the stream alive - don't exit the function
			console.log(`[SCPv2] SSE stream connection established, keeping alive...`)
		} catch (error) {
			console.log(`[SCPv2] Failed to start subscription: ${error}`)
			if (error instanceof Error) {
				console.log(`[SCPv2] Subscription error details: ${error.message}`)
				console.log(`[SCPv2] Subscription error stack: ${error.stack}`)
			}
			throw new Error('SSE connection failed during startup')
		}
	}

	private async subscribeToResources(): Promise<void> {
		if (!this.sessionUUID) {
			throw new Error('No sessionUUID available for resource subscription')
		}

		try {
			console.log(`[SCPv2] Step 2: Subscribing to resources using sessionUUID: ${this.sessionUUID}`)

			// Build the list of resources to subscribe to
			const resources = this.buildSubscriptionResources()
			console.log(`[SCPv2] Subscribing to ${resources.length} resources:`, resources)

			// PUT request to subscribe to resources using the correct API path
			// According to the API docs: PUT /api/ssc/state/subscriptions/{sessionUUID}
			// Payload should be just the resources array, not wrapped in an object
			const response = await this.httpClient.put(`/api/ssc/state/subscriptions/${this.sessionUUID}`, resources)
			console.log(`[SCPv2] Resource subscription response:`, response)
			console.log(`[SCPv2] Successfully subscribed to all resources`)
		} catch (error) {
			console.log(`[SCPv2] Failed to subscribe to resources: ${error}`)
			throw error
		}
	}

	private handleSSEMessage(data: any): void {
		console.log(`[SCPv2] Handling SSE message:`, data)

		// Parse the message using the existing parseMessage method
		this.parseMessage(data)
	}

	private scheduleReconnection(): void {
		console.log(`[SCPv2] Scheduling reconnection...`)
		this.deviceConnected = false

		// Update Companion status to show we're disconnected and trying to reconnect
		this.context.updateStatus(InstanceStatus.Disconnected, 'Connection lost, attempting to reconnect...')

		// Clean up current stream
		if (this.sseStream) {
			console.log(`[SCPv2] Cleaning up SSE stream...`)
			this.sseStream.destroy()
			this.sseStream = null
		}

		// Clear sessionUUID on disconnection
		if (this.sessionUUID) {
			console.log(`[SCPv2] Clearing sessionUUID: ${this.sessionUUID}`)
			this.sessionUUID = null
		}

		// Stop heartbeat
		this.stopHeartbeat()

		// Increment reconnection attempts
		this.reconnectAttempts++

		// Calculate backoff delay: start with 2 seconds, double each time up to 30 seconds max
		const baseDelay = 2000
		const maxDelay = 30000
		const backoffDelay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts - 1), maxDelay)

		console.log(`[SCPv2] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
		console.log(`[SCPv2] Will attempt reconnection in ${backoffDelay / 1000} seconds...`)

		// Clear any existing timer
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
		}

		// Check if we've exceeded max attempts
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.log(`[SCPv2] Maximum reconnection attempts (${this.maxReconnectAttempts}) reached. Stopping.`)
			this.context.updateStatus(
				InstanceStatus.ConnectionFailure,
				`Failed to reconnect after ${this.maxReconnectAttempts} attempts`,
			)
			return
		}

		this.reconnectTimer = setTimeout(() => {
			console.log(`[SCPv2] Attempting automatic reconnection (attempt ${this.reconnectAttempts})...`)
			this.context.updateStatus(
				InstanceStatus.Connecting,
				`Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
			)

			this.connect()
				.then(() => {
					// Reset reconnection counter on successful connection
					this.reconnectAttempts = 0
					console.log(`[SCPv2] Reconnection successful, reset attempt counter`)
				})
				.catch((error) => {
					console.log(`[SCPv2] Reconnection attempt ${this.reconnectAttempts} failed: ${error}`)
					// The error will trigger another scheduleReconnection call
				})
		}, backoffDelay)
	}

	private startHeartbeat(): void {
		console.log(`[SCPv2] Starting heartbeat to keep connection alive...`)

		// Clear any existing heartbeat
		this.stopHeartbeat()

		// Send a lightweight request every 60 seconds to keep connection alive
		this.heartbeatTimer = setInterval(() => {
			if (this.deviceConnected && this.sessionUUID) {
				// Use void to explicitly ignore the promise
				void this.sendHeartbeat()
			}
		}, 60000) // 60 seconds
	}

	private async sendHeartbeat(): Promise<void> {
		try {
			console.log(`[SCPv2] Sending heartbeat...`)
			// Just check if our subscription is still alive
			await this.httpClient.get(`/api/ssc/state/subscriptions/${this.sessionUUID}`)
			console.log(`[SCPv2] Heartbeat successful`)
		} catch (error) {
			console.log(`[SCPv2] Heartbeat failed: ${error}`)
			// Don't trigger reconnection here, let the SSE error handler do it
		}
	}

	private stopHeartbeat(): void {
		if (this.heartbeatTimer) {
			console.log(`[SCPv2] Stopping heartbeat...`)
			clearInterval(this.heartbeatTimer)
			this.heartbeatTimer = null
		}
	}

	private buildSubscriptionResources(): string[] {
		const resources = [
			// Device-level resources
			'/api/device/site',
			'/api/device/identification',
			'/api/device/state',
			'/api/device/identity',
			'/api/firmware/update/state',
			'/api/rf',
		]

		// RF settings
		resources.push('/api/rf', '/api/rf/encryption', '/api/rf/transmission')

		// Channel-specific resources
		const maxChannels = this.model === DeviceModel.EM4 ? 4 : 2
		for (let i = 0; i < maxChannels; i++) {
			resources.push(
				`/api/channel/${i}`,
				`/api/channel/${i}/warnings`,
				`/api/channel/${i}/identify`,
				`/api/rf/channels/${i}`,
				`/api/syncSettings/${i}`,
				`/api/transmitters/${i}`,
				`/api/transmitters/${i}/battery`,
				`/api/transmitters/${i}/warnings`,
			)
		}

		// Legacy mode for SCPv1 compatibility
		resources.push('/api/ssc/legacyMode')

		return resources
	}

	// Override the inherited socket-based methods with REST API calls

	// Parse incoming SCPv2 messages (JSON format)
	parseMessage(json: Record<string, unknown>): void {
		console.log(`[SCPv2] Parsing SSE message:`, json)
		if (!json || typeof json !== 'object') {
			console.log(`[SCPv2] Invalid message format - not an object`)
			return
		}

		// SCPv2 uses different JSON structure than SCPv1
		// Messages come as: { "/path": { data } }
		try {
			// The SSE data format from /api/ssc/state/subscriptions
			// Each update contains the full resource path and current state
			const entries = Object.entries(json)
			console.log(`[SCPv2] Processing ${entries.length} updates`)

			for (const [path, data] of entries) {
				console.log(`[SCPv2] Processing update for path: ${path}`)
				this.processSCPv2Update(path, data)
			}

			// Trigger feedback updates after processing all changes
			this.context.checkFeedbacks()
		} catch (error) {
			console.log(`[SCPv2] Error parsing SCPv2 message: ${error}`)
		}
	}

	private processSCPv2Update(path: string, data: unknown): void {
		console.log(`[SCPv2] Processing update for ${path}:`, data)
		try {
			// Convert REST API paths to internal channel indices
			const channelMatch = path.match(/\/api\/channel\/(\d+)/)
			const transmitterMatch = path.match(/\/api\/transmitters\/(\d+)/)
			const rfChannelMatch = path.match(/\/api\/rf\/channels\/(\d+)/)

			if (channelMatch) {
				const channelIndex = parseInt(channelMatch[1])
				console.log(`[SCPv2] Channel ${channelIndex} update for ${path}`)
				this.processChannelUpdate(channelIndex, path, data)
			} else if (transmitterMatch) {
				const transmitterIndex = parseInt(transmitterMatch[1])
				console.log(`[SCPv2] Transmitter ${transmitterIndex} update for ${path}`)
				this.processTransmitterUpdate(transmitterIndex, path, data)
			} else if (rfChannelMatch) {
				const channelIndex = parseInt(rfChannelMatch[1])
				console.log(`[SCPv2] RF channel ${channelIndex} update for ${path}`)

				this.processRFChannelUpdate(channelIndex, path, data)
			} else if (path.startsWith('/api/syncSettings/')) {
				const syncMatch = path.match(/\/api\/syncSettings\/(\d+)/)
				if (syncMatch) {
					const channelIndex = parseInt(syncMatch[1])
					this.processSyncSettingsUpdate(channelIndex, path, data)
				}
			} else if (path.startsWith('/api/device/')) {
				this.processDeviceUpdate(path, data)
			} else if (path.startsWith('/api/rf/')) {
				this.processRFUpdate(path, data)
			}
		} catch (error) {
			console.log('error', `Error processing SCPv2 update for ${path}: ${error}`)
		}
	}

	private processChannelUpdate(channelIndex: number, path: string, data: unknown): void {
		const channelNum = channelIndex + 1

		if (path.includes('/signalQualityIndicator')) {
			const value = (data as any)?.value ?? 0
			this.channels[channelIndex].rsqi = value
			this.updateVariable(`rx${channelNum}_rsqi`, value)
		} else if (path.includes('/signalStrengthIndicator')) {
			const value = (data as any)?.value ?? 0
			this.updateVariable(`rx${channelNum}_signal_strength`, value)
		} else if (path.includes('/diversityIndicator')) {
			const value = (data as any)?.value ?? 1
			this.channels[channelIndex].activeAntenna = value
		} else if (path.includes('/level')) {
			const value = (data as any)?.value ?? 0
			this.updateVariable(`rx${channelNum}_audio_level`, value)
		} else if (path.includes('/warnings')) {
			const warnings = (data as any) || []
			this.channels[channelIndex].hasAfPeakWarning = warnings.includes('AfPeak')
			this.channels[channelIndex].hasAes256Error = warnings.includes('Aes256Error')
			this.channels[channelIndex].warnings = warnings.length > 0
			this.updateVariable(`rx${channelNum}_warnings`, warnings.join(', '))
		} else if (path.includes('/identify')) {
			const enabled = (data as any)?.enabled ?? false
			this.channels[channelIndex].identification = enabled
			this.updateVariable(`rx${channelNum}_identification`, enabled ? 1 : 0)
		} else if (path === `/api/channel/${channelIndex}`) {
			// Main channel data
			const channel = data as any
			if (channel) {
				if ('name' in channel) {
					this.channels[channelIndex].name = channel.name
					this.updateVariable(`rx${channelNum}_name`, channel.name)
				}
				if ('mute' in channel) {
					this.channels[channelIndex].muted = channel.mute
					this.updateVariable(`rx${channelNum}_muted`, channel.mute ? 1 : 0)
				}
				if ('gain' in channel) {
					this.channels[channelIndex].gain = channel.gain
					this.updateVariable(`rx${channelNum}_gain`, channel.gain)
				}
				if ('outputLevel' in channel) {
					this.updateVariable(`rx${channelNum}_output_level`, channel.outputLevel)
				}
			}
		}
	}

	private processTransmitterUpdate(transmitterIndex: number, path: string, data: unknown): void {
		const channelNum = transmitterIndex + 1

		if (path.includes('/battery')) {
			const battery = data as any
			if (battery) {
				this.channels[transmitterIndex].mate.batteryGauge = battery.gauge ?? 0
				this.channels[transmitterIndex].mate.batteryType = battery.type ?? 'Unknown'
				this.channels[transmitterIndex].mate.batteryLifetime = battery.lifetime ?? 0

				this.updateVariable(`tx${channelNum}_batteryGauge`, battery.gauge ?? 0)
				this.updateVariable(`tx${channelNum}_batteryType`, battery.type ?? 'Unknown')
				this.updateVariable(`tx${channelNum}_batteryLifetime`, battery.lifetime ?? 0)
			}
		} else if (path.includes('/warnings')) {
			const warnings = (data as any) || []
			this.updateVariable(`tx${channelNum}_warnings`, warnings.join(', '))
		} else if (path === `/api/transmitters/${transmitterIndex}`) {
			// Main transmitter data
			const transmitter = data as any
			if (transmitter) {
				if ('name' in transmitter) {
					this.updateVariable(`tx${channelNum}_name`, transmitter.name)
				}
				if ('mute' in transmitter) {
					this.channels[transmitterIndex].mate.muted = transmitter.mute
					this.updateVariable(`tx${channelNum}_muted`, transmitter.mute ? 1 : 0)
				}
				if ('type' in transmitter) {
					this.updateVariable(`tx${channelNum}_type`, transmitter.type)
				}
				if ('capsule' in transmitter) {
					this.updateVariable(`tx${channelNum}_capsule`, transmitter.capsule)
				}
				if ('trim' in transmitter) {
					this.updateVariable(`tx${channelNum}_trim`, transmitter.trim)
				}
				if ('lowcut' in transmitter) {
					this.updateVariable(`tx${channelNum}_lowcut`, transmitter.lowcut)
				}
				if ('lock' in transmitter) {
					this.updateVariable(`tx${channelNum}_lock`, transmitter.lock ? 1 : 0)
				}
				if ('led' in transmitter) {
					this.updateVariable(`tx${channelNum}_led`, transmitter.led ? 1 : 0)
				}
				if ('identification' in transmitter) {
					this.updateVariable(`tx${channelNum}_identification`, transmitter.identification ? 1 : 0)
				}
				if ('cableEmulation' in transmitter) {
					this.updateVariable(`tx${channelNum}_cableEmulation`, transmitter.cableEmulation)
				}
			}
		}
	}

	private processRFChannelUpdate(channelIndex: number, _path: string, data: unknown): void {
		const channelNum = channelIndex + 1
		const rfChannel = data as any

		if (rfChannel && 'frequency' in rfChannel) {
			this.channels[channelIndex].frequency = rfChannel.frequency
			this.updateVariable(`rx${channelNum}_frequency`, rfChannel.frequency)
		}
		if (rfChannel && 'presets' in rfChannel) {
			const presets = rfChannel.presets
			if (presets) {
				this.updateVariable(`rx${channelNum}_preset_type`, presets.type ?? 'None')
				this.updateVariable(`rx${channelNum}_preset_bank`, presets.bank ?? 0)
				this.updateVariable(`rx${channelNum}_preset_channel`, presets.channel ?? 0)
			}
		}
	}

	private processDeviceUpdate(path: string, data: unknown): void {
		const device = data as any

		switch (path) {
			case '/api/device/site':
				if (device?.deviceName) {
					this.name = device.deviceName
					this.updateVariable('device_name', device.deviceName)
				}
				if (device?.location) {
					this.location = device.location
					this.updateVariable('device_location', device.location)
				}
				break
			case '/api/device/identity':
				if (device) {
					if (device.serial) this.updateVariable('device_serial', device.serial)
					if (device.hardwareRevision) this.updateVariable('device_hardware_revision', device.hardwareRevision)
					if (device.product) this.updateVariable('device_product', device.product)
					if (device.vendor) this.updateVariable('device_vendor', device.vendor)
				}
				break
			case '/api/device/identification':
				if (device?.visual !== undefined) {
					this.identification = device.visual
					this.updateVariable('device_identification', device.visual ? 1 : 0)
				}
				break
			case '/api/device/state':
				if (device?.state) {
					this.updateVariable('device_state', device.state)
				}
				if (device?.warnings) {
					this.updateVariable('device_warnings', device.warnings.join(', '))
				}
				break
		}
	}

	private processRFUpdate(path: string, data: unknown): void {
		switch (path) {
			case '/api/rf/encryption': {
				const encryption = data as any
				if (encryption && 'enabled' in encryption) {
					this.encryption = encryption.enabled
					this.updateVariable('device_encryption', encryption.enabled ? 1 : 0)
				}
				break
			}
			case '/api/rf/transmission': {
				const transmission = data as any
				if (transmission) {
					if ('mode' in transmission) {
						this.linkDensityMode = transmission.mode === 'LinkDensity'
						this.updateVariable('device_link_density_mode', this.linkDensityMode ? 1 : 0)
					}
					if ('presetSpacing' in transmission) {
						this.updateVariable('device_preset_spacing', transmission.presetSpacing)
					}
				}
				break
			}
			case '/api/rf': {
				const rf = data as any
				if (rf) {
					if ('code' in rf) {
						this.frequencyCode = rf.code
						this.updateVariable('device_frequency_code', rf.code)
					}
					if ('ranges' in rf) {
						this.updateVariable('device_frequency_ranges', JSON.stringify(rf.ranges))
					}
				}
				break
			}
		}
	}

	private processSyncSettingsUpdate(channelIndex: number, path: string, data: unknown): void {
		const channelNum = channelIndex + 1

		if (path.includes('/ignore')) {
			// Sync ignore settings
			const settings = data as any
			if (settings) {
				if ('muteConfig' in settings) {
					this.channels[channelIndex].syncIgnoreMuteConfig = settings.muteConfig
					this.updateVariable(`rx${channelNum}_sync_ignore_mute_config`, settings.muteConfig ? 1 : 0)
				}
				if ('cableEmulation' in settings) {
					this.channels[channelIndex].syncIgnoreCableEmulation = settings.cableEmulation
					this.updateVariable(`rx${channelNum}_sync_ignore_cable_emulation`, settings.cableEmulation ? 1 : 0)
				}
				if ('lowcut' in settings) {
					this.channels[channelIndex].syncIgnoreLowcut = settings.lowcut
					this.updateVariable(`rx${channelNum}_sync_ignore_lowcut`, settings.lowcut ? 1 : 0)
				}
				if ('lock' in settings) {
					this.channels[channelIndex].syncIgnoreLock = settings.lock
					this.updateVariable(`rx${channelNum}_sync_ignore_lock`, settings.lock ? 1 : 0)
				}
				if ('trim' in settings) {
					this.channels[channelIndex].syncIgnoreTrim = settings.trim
					this.updateVariable(`rx${channelNum}_sync_ignore_trim`, settings.trim ? 1 : 0)
				}
				if ('led' in settings) {
					this.channels[channelIndex].syncIgnoreLED = settings.led
					this.updateVariable(`rx${channelNum}_sync_ignore_led`, settings.led ? 1 : 0)
				}
				if ('name' in settings) {
					this.channels[channelIndex].syncIgnoreName = settings.name
					this.updateVariable(`rx${channelNum}_sync_ignore_name`, settings.name ? 1 : 0)
				}
				if ('frequency' in settings) {
					this.channels[channelIndex].syncIgnoreFrequency = settings.frequency
					this.updateVariable(`rx${channelNum}_sync_ignore_frequency`, settings.frequency ? 1 : 0)
				}
			}
		} else {
			// Main sync settings
			const settings = data as any
			if (settings) {
				if ('muteConfig' in settings) {
					// Convert string to enum value
					const muteMap: Record<string, number> = { Off: 0, RfMute: 1, AfMute: 2 }
					this.channels[channelIndex].mate.muteConfig = muteMap[settings.muteConfig] ?? 0
					this.updateVariable(`rx${channelNum}_sync_mute_config`, settings.muteConfig)
				}
				if ('muteConfigTs' in settings) {
					this.updateVariable(`rx${channelNum}_sync_mute_config_ts`, settings.muteConfigTs)
				}
				if ('cableEmulation' in settings) {
					this.updateVariable(`rx${channelNum}_sync_cable_emulation`, settings.cableEmulation)
				}
				if ('lowcut' in settings) {
					this.updateVariable(`rx${channelNum}_sync_lowcut`, settings.lowcut)
				}
				if ('lock' in settings) {
					this.updateVariable(`rx${channelNum}_sync_lock`, settings.lock ? 1 : 0)
				}
				if ('trim' in settings) {
					this.updateVariable(`rx${channelNum}_sync_trim`, settings.trim)
				}
				if ('led' in settings) {
					this.updateVariable(`rx${channelNum}_sync_led`, settings.led ? 1 : 0)
				}
			}
		}
	}

	// REST API methods for SCPv2

	async getReceiverName(): Promise<string> {
		try {
			const response = await this.httpClient.get<{ device: { name: string } }>('/api/device/site')
			return response.device?.name || 'EW-DX Device'
		} catch (error) {
			this.logError('Failed to get receiver name', error as Error)
			return 'EW-DX Device'
		}
	}

	async setReceiverName(name: string): Promise<void> {
		try {
			await this.httpClient.put('/api/device/site', { device: { name } })
		} catch (error) {
			this.logError('Failed to set receiver name', error as Error)
		}
	}

	async getChannelName(channelIndex: number): Promise<string> {
		try {
			const response = await this.httpClient.get<{ channel: { name: string } }>(`/api/channel/${channelIndex}`)
			return response.channel?.name || `CH${channelIndex + 1}`
		} catch (error) {
			this.logError(`Failed to get channel ${channelIndex + 1} name`, error as Error)
			return `CH${channelIndex + 1}`
		}
	}

	async setChannelName(channelIndex: number, name: string): Promise<void> {
		try {
			await this.httpClient.put(`/api/channel/${channelIndex}`, { name: name.toUpperCase().substring(0, 8) })
		} catch (error) {
			this.logError(`Failed to set channel ${channelIndex + 1} name`, error as Error)
		}
	}

	async getChannelMute(channelIndex: number): Promise<boolean> {
		try {
			const response = await this.httpClient.get<{ channel: { mute: boolean } }>(`/api/channel/${channelIndex}`)
			return response.channel?.mute ?? false
		} catch (error) {
			this.logError(`Failed to get channel ${channelIndex + 1} mute status`, error as Error)
			return false
		}
	}

	async setChannelMute(channelIndex: number, mute: boolean): Promise<void> {
		try {
			await this.httpClient.put(`/api/channel/${channelIndex}`, { channel: { mute } })
		} catch (error) {
			this.logError(`Failed to set channel ${channelIndex + 1} mute`, error as Error)
		}
	}

	async getChannelGain(channelIndex: number): Promise<number> {
		try {
			const response = await this.httpClient.get<{ channel: { gain: number } }>(`/api/channel/${channelIndex}`)
			return response.channel?.gain ?? 0
		} catch (error) {
			this.logError(`Failed to get channel ${channelIndex + 1} gain`, error as Error)
			return 0
		}
	}

	async setChannelGain(channelIndex: number, gain: number): Promise<void> {
		try {
			// Clamp gain to valid range based on API documentation
			const clampedGain = Math.max(-12, Math.min(54, gain))
			await this.httpClient.put(`/api/channel/${channelIndex}`, { channel: { gain: clampedGain } })
		} catch (error) {
			this.logError(`Failed to set channel ${channelIndex + 1} gain`, error as Error)
		}
	}

	async getChannelLowCut(channelIndex: number): Promise<number> {
		try {
			const response = await this.httpClient.get<{ channel: { lowCut: number } }>(`/api/channel/${channelIndex}`)
			return response.channel?.lowCut ?? 0
		} catch (error) {
			this.logError(`Failed to get channel ${channelIndex + 1} low cut`, error as Error)
			return 0
		}
	}

	async setChannelLowCut(channelIndex: number, lowCut: number): Promise<void> {
		try {
			// Valid values: 0, 60, 80, 100, 120, 160 Hz
			const validValues = [0, 60, 80, 100, 120, 160]
			const validLowCut = validValues.reduce((prev, curr) =>
				Math.abs(curr - lowCut) < Math.abs(prev - lowCut) ? curr : prev,
			)
			await this.httpClient.put(`/api/channel/${channelIndex}`, { channel: { lowCut: validLowCut } })
		} catch (error) {
			this.logError(`Failed to set channel ${channelIndex + 1} low cut`, error as Error)
		}
	}

	async setChannelIdentify(channelIndex: number, identify: boolean): Promise<void> {
		try {
			await this.httpClient.put(`/api/channel/${channelIndex}/identify`, { identify })
		} catch (error) {
			this.logError(`Failed to set channel ${channelIndex + 1} identify`, error as Error)
		}
	}

	async getChannelFrequency(channelIndex: number): Promise<number> {
		try {
			const response = await this.httpClient.get<{ channel: { frequency: number } }>(`/api/rf/channels/${channelIndex}`)
			return response.channel?.frequency ?? 0
		} catch (error) {
			this.logError(`Failed to get channel ${channelIndex + 1} frequency`, error as Error)
			return 0
		}
	}

	async setChannelFrequency(channelIndex: number, frequency: number): Promise<void> {
		try {
			await this.httpClient.put(`/api/rf/channels/${channelIndex}/frequency`, { frequency: frequency })
		} catch (error) {
			this.logError(`Failed to set channel ${channelIndex + 1} frequency`, error as Error)
		}
	}

	async setDeviceIdentify(identify: boolean): Promise<void> {
		try {
			await this.httpClient.put('/api/device/identification', { visual: identify })
		} catch (error) {
			this.logError('Failed to set device identify', error as Error)
		}
	}

	async getDeviceInfo(): Promise<Record<string, unknown>> {
		try {
			const [identity, site] = await Promise.all([
				this.httpClient.get('/api/device/identity'),
				this.httpClient.get('/api/device/site'),
			])
			return { identity, site }
		} catch (error) {
			this.logError('Failed to get device info', error as Error)
			return {}
		}
	}

	// Device-level control methods

	async setDeviceLocation(location: string): Promise<void> {
		try {
			await this.httpClient.put('/api/device/site', { location })
		} catch (error) {
			this.logError('Failed to set device location', error as Error)
		}
	}

	async setEncryption(enabled: boolean): Promise<void> {
		try {
			await this.httpClient.put('/api/rf/encryption', { enabled })
		} catch (error) {
			this.logError('Failed to set encryption', error as Error)
		}
	}

	async setLinkDensityMode(enabled: boolean): Promise<void> {
		try {
			const mode = enabled ? 'LinkDensity' : 'Standard'
			await this.httpClient.put('/api/rf/transmission', { mode })
		} catch (error) {
			this.logError('Failed to set link density mode', error as Error)
		}
	}

	// Channel-level advanced control methods

	async setChannelOutputLevel(channelIndex: number, outputLevel: number): Promise<void> {
		try {
			// Valid values: -24dB to +18dB in 6dB steps
			const validValues = [-24, -18, -12, -6, 0, 6, 12, 18]
			const validLevel = validValues.reduce((prev, curr) =>
				Math.abs(curr - outputLevel) < Math.abs(prev - outputLevel) ? curr : prev,
			)
			await this.httpClient.put(`/api/channel/${channelIndex}`, { outputLevel: validLevel })
		} catch (error) {
			this.logError(`Failed to set channel ${channelIndex + 1} output level`, error as Error)
		}
	}

	async restoreChannelAudioDefaults(channelIndex: number): Promise<void> {
		try {
			await this.httpClient.put(`/api/channel/${channelIndex}/restore`, { mode: 'AudioDefault' })
		} catch (error) {
			this.logError(`Failed to restore channel ${channelIndex + 1} audio defaults`, error as Error)
		}
	}

	async acknowledgeChannelSorting(channelIndex: number): Promise<void> {
		try {
			await this.httpClient.put(`/api/channel/${channelIndex}/channelSorting`, { sorted: true })
		} catch (error) {
			this.logError(`Failed to acknowledge channel ${channelIndex + 1} sorting`, error as Error)
		}
	}

	async setChannelFrequencyByPreset(
		channelIndex: number,
		type: 'Factory' | 'User',
		bank: number,
		channel: number,
	): Promise<void> {
		try {
			await this.httpClient.put(`/api/rf/channels/${channelIndex}/preset`, { type, bank, channel })
		} catch (error) {
			this.logError(`Failed to set channel ${channelIndex + 1} frequency by preset`, error as Error)
		}
	}

	// Sync Settings methods

	async setSyncSettings(
		channelIndex: number,
		settings: {
			muteConfig?: string
			cableEmulation?: string
			lowcut?: string
			lock?: boolean
			trim?: number
			led?: boolean
			muteConfigTs?: string
		},
	): Promise<void> {
		try {
			await this.httpClient.put(`/api/syncSettings/${channelIndex}`, settings)
		} catch (error) {
			this.logError(`Failed to set sync settings for channel ${channelIndex + 1}`, error as Error)
		}
	}

	async setSyncIgnoreSettings(
		channelIndex: number,
		settings: {
			muteConfig?: boolean
			cableEmulation?: boolean
			lowcut?: boolean
			lock?: boolean
			trim?: boolean
			led?: boolean
			name?: boolean
			frequency?: boolean
		},
	): Promise<void> {
		try {
			await this.httpClient.put(`/api/syncSettings/${channelIndex}/ignore`, settings)
		} catch (error) {
			this.logError(`Failed to set sync ignore settings for channel ${channelIndex + 1}`, error as Error)
		}
	}

	// Individual sync setting methods for easier use in actions

	async setMuteConfigSK(channelIndex: number, muteConfig: 'Off' | 'RfMute' | 'AfMute'): Promise<void> {
		await this.setSyncSettings(channelIndex, { muteConfig })
	}

	async setMuteConfigTable(channelIndex: number, muteConfigTs: 'AfMute' | 'Off' | 'PTT' | 'PTM'): Promise<void> {
		await this.setSyncSettings(channelIndex, { muteConfigTs })
	}

	async setCableEmulation(channelIndex: number, cableEmulation: 'Off' | 'Type1' | 'Type2' | 'Type3'): Promise<void> {
		await this.setSyncSettings(channelIndex, { cableEmulation })
	}

	async setLowcut(channelIndex: number, lowcut: 'Off' | '30Hz' | '60Hz' | '80Hz' | '100Hz' | '120Hz'): Promise<void> {
		await this.setSyncSettings(channelIndex, { lowcut })
	}

	async setAutoLock(channelIndex: number, lock: boolean): Promise<void> {
		await this.setSyncSettings(channelIndex, { lock })
	}

	// Device-level method to set autolock for all channels (for compatibility with SCPv1)
	async setAutoLockAllChannels(lock: boolean): Promise<void> {
		const maxChannels = this.model === DeviceModel.EM4 ? 4 : 2
		for (let i = 0; i < maxChannels; i++) {
			await this.setAutoLock(i, lock)
		}
	}

	async setTrim(channelIndex: number, trim: number): Promise<void> {
		// Clamp trim to valid range: -12 to +6
		const clampedTrim = Math.max(-12, Math.min(6, trim))
		await this.setSyncSettings(channelIndex, { trim: clampedTrim })
	}

	async setTXLED(channelIndex: number, led: boolean): Promise<void> {
		await this.setSyncSettings(channelIndex, { led })
	}

	async setSyncIgnore(channelIndex: number, setting: string, ignore: boolean): Promise<void> {
		const settingsMap: Record<string, string> = {
			trim_ignore: 'trim',
			name_ignore: 'name',
			mute_config_ignore: 'muteConfig',
			lowcut_ignore: 'lowcut',
			lock_ignore: 'lock',
			led_ignore: 'led',
			frequency_ignore: 'frequency',
			cable_emulation_ignore: 'cableEmulation',
		}

		const apiSetting = settingsMap[setting]
		if (apiSetting) {
			await this.setSyncIgnoreSettings(channelIndex, { [apiSetting]: ignore })
		}
	}

	// Device-level compatibility methods to match SCPv1 interface

	setBrightness(_brightness: number): void {
		// Brightness control is not available in SCPv2 API
		console.log('debug', 'Brightness control not available in SCPv2')
	}

	setIdentification(identify: boolean): void {
		this.setDeviceIdentify(identify)
			.then(() => {
				this.identification = identify
			})
			.catch((error) => {
				console.log('error', `Failed to set identification: ${error}`)
			})
	}

	setName(name: string): void {
		this.setReceiverName(name)
			.then(() => {
				this.name = name
			})
			.catch((error) => {
				console.log('error', `Failed to set name: ${error}`)
			})
	}

	setLocation(location: string): void {
		this.setDeviceLocation(location)
			.then(() => {
				this.location = location
			})
			.catch((error) => {
				console.log('error', `Failed to set location: ${error}`)
			})
	}

	setNetworkSettings(_dhcp: boolean, _mdns: boolean, _ip: string, _netmask: string, _gateway: string): void {
		// Network settings API not implemented in SCPv2 documentation
		console.log('debug', 'Network settings control not implemented in SCPv2')
	}

	restart(): void {
		// Restart API not available in SCPv2 documentation
		console.log('debug', 'Restart command not available in SCPv2')
	}

	setDanteNetworkSettings(_interfaceId: number, _dhcp: boolean, _ip: string, _netmask: string, _gateway: string): void {
		// Dante network settings not available in SCPv2 API documentation
		console.log('debug', 'Dante network settings not available in SCPv2')
	}

	setDantePortMapping(_mapping: number): void {
		// Dante port mapping not available in SCPv2 API documentation
		console.log('debug', 'Dante port mapping not available in SCPv2')
	}

	private async getStaticInformationAsync(): Promise<void> {
		console.log(`[SCPv2] Fetching static device information...`)

		try {
			// Get device identity and basic information
			console.log(`[SCPv2] Getting device identity...`)
			const identity = await this.httpClient.get('/api/device/identity')
			console.log(`[SCPv2] Device identity:`, identity)

			console.log(`[SCPv2] Getting device site information...`)
			const site = await this.httpClient.get('/api/device/site')
			console.log(`[SCPv2] Device site:`, site)

			console.log(`[SCPv2] Getting device state...`)
			const state = await this.httpClient.get('/api/device/state')
			console.log(`[SCPv2] Device state:`, state)

			// Get RF settings
			console.log(`[SCPv2] Getting RF encryption settings...`)
			const encryption = await this.httpClient.get('/api/rf/encryption')
			console.log(`[SCPv2] RF encryption:`, encryption)

			console.log(`[SCPv2] Getting RF transmission settings...`)
			const transmission = await this.httpClient.get('/api/rf/transmission')
			console.log(`[SCPv2] RF transmission:`, transmission)

			// Get channel information
			const maxChannels = this.model === DeviceModel.EM4 ? 4 : 2
			console.log(`[SCPv2] Getting information for ${maxChannels} channels...`)

			for (let i = 0; i < maxChannels; i++) {
				console.log(`[SCPv2] Getting channel ${i} data...`)

				// Get channel data
				const channelData = await this.httpClient.get(`/api/channel/${i}`)
				console.log(`[SCPv2] Channel ${i} data:`, channelData)

				const signalQuality = await this.httpClient.get(`/api/channel/${i}/signalQualityIndicator`)
				console.log(`[SCPv2] Channel ${i} signal quality:`, signalQuality)

				const signalStrength = await this.httpClient.get(`/api/channel/${i}/signalStrengthIndicator`)
				console.log(`[SCPv2] Channel ${i} signal strength:`, signalStrength)

				const level = await this.httpClient.get(`/api/channel/${i}/level`)
				console.log(`[SCPv2] Channel ${i} level:`, level)

				// Get RF channel data
				const rfChannel = await this.httpClient.get(`/api/rf/channels/${i}`)
				console.log(`[SCPv2] RF channel ${i} data:`, rfChannel)

				// Get transmitter data
				console.log(`[SCPv2] Getting transmitter ${i} data...`)
				try {
					const transmitter = await this.httpClient.get(`/api/transmitters/${i}`)
					console.log(`[SCPv2] Transmitter ${i} data:`, transmitter)

					const battery = await this.httpClient.get(`/api/transmitters/${i}/battery`)
					console.log(`[SCPv2] Transmitter ${i} battery:`, battery)
				} catch (txError) {
					console.log(`[SCPv2] Transmitter ${i} not available or error:`, txError)
				}
			}

			console.log(`[SCPv2] Static information fetch completed successfully`)
		} catch (error) {
			console.log(`[SCPv2] Error fetching static information: ${error}`)
			if (error instanceof Error) {
				console.log(`[SCPv2] Static info error details: ${error.message}`)
			}
			throw error
		}
	}

	// Override destroy method to cleanup SCPv2 connections
	destroy(): void {
		console.log(`[SCPv2] Destroying connection...`)

		// Explicitly close subscription if we have a sessionUUID
		if (this.sessionUUID) {
			console.log(`[SCPv2] Closing subscription ${this.sessionUUID}...`)
			this.httpClient.delete(`/api/ssc/state/subscriptions/${this.sessionUUID}`).catch((error) => {
				console.log(`[SCPv2] Failed to close subscription: ${error}`)
			})
			this.sessionUUID = null
		}

		if (this.sseStream) {
			console.log(`[SCPv2] Closing SSE connection...`)
			this.sseStream.destroy()
			this.sseStream = null
		}

		if (this.reconnectTimer) {
			console.log(`[SCPv2] Clearing reconnection timer...`)
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = null
		}

		// Stop heartbeat
		this.stopHeartbeat()

		this.deviceConnected = false
		console.log(`[SCPv2] Connection destroyed successfully`)
	}

	// Subscription resource management methods for SSCv2

	/**
	 * Add resources to the existing subscription
	 */
	async addSubscriptionResources(resources: string[]): Promise<void> {
		if (!this.sessionUUID) {
			throw new Error('No active subscription - sessionUUID is null')
		}

		console.log(`[SCPv2] Adding ${resources.length} resources to subscription ${this.sessionUUID}:`, resources)
		try {
			await this.httpClient.put(`/api/ssc/state/subscriptions/${this.sessionUUID}/add`, resources)
			console.log(`[SCPv2] Resources added successfully`)
		} catch (error) {
			console.log(`[SCPv2] Failed to add resources: ${error}`)
			throw error
		}
	}

	/**
	 * Remove resources from the existing subscription
	 */
	async removeSubscriptionResources(resources: string[]): Promise<void> {
		if (!this.sessionUUID) {
			throw new Error('No active subscription - sessionUUID is null')
		}

		console.log(`[SCPv2] Removing ${resources.length} resources from subscription ${this.sessionUUID}:`, resources)
		try {
			await this.httpClient.put(`/api/ssc/state/subscriptions/${this.sessionUUID}/remove`, resources)
			console.log(`[SCPv2] Resources removed successfully`)
		} catch (error) {
			console.log(`[SCPv2] Failed to remove resources: ${error}`)
			throw error
		}
	}

	/**
	 * Replace the full set of subscribed resources
	 */
	async replaceSubscriptionResources(resources: string[]): Promise<void> {
		if (!this.sessionUUID) {
			throw new Error('No active subscription - sessionUUID is null')
		}

		console.log(
			`[SCPv2] Replacing subscription resources for ${this.sessionUUID} with ${resources.length} resources:`,
			resources,
		)
		try {
			await this.httpClient.put(`/api/ssc/state/subscriptions/${this.sessionUUID}`, resources)
			console.log(`[SCPv2] Subscription resources replaced successfully`)
		} catch (error) {
			console.log(`[SCPv2] Failed to replace subscription resources: ${error}`)
			throw error
		}
	}

	/**
	 * Get current subscription status and resources
	 */
	async getSubscriptionStatus(): Promise<string[]> {
		if (!this.sessionUUID) {
			throw new Error('No active subscription - sessionUUID is null')
		}

		console.log(`[SCPv2] Getting subscription status for ${this.sessionUUID}`)
		try {
			const resources = await this.httpClient.get<string[]>(`/api/ssc/state/subscriptions/${this.sessionUUID}`)
			console.log(`[SCPv2] Current subscription has ${resources.length} resources:`, resources)
			return resources
		} catch (error) {
			console.log(`[SCPv2] Failed to get subscription status: ${error}`)
			throw error
		}
	}

	// Implement required abstract methods
	publishVariableValues(): void {
		// Basic variables for the device
		this.context.setVariableValues({
			device_name: this.name,
			device_connected: this.deviceConnected ? 1 : 0,
			device_location: this.location,
			device_identification: this.identification ? 1 : 0,
			device_mdns: this.mdns ? 1 : 0,
		})
	}

	resetAllValues(): void {
		this.name = UNKNOWN
		this.location = UNKNOWN
		this.identification = false
		this.mdns = false
		this.networkInterface.resetValues()
		this.publishVariableValues()
	}

	// Override SCPv1 polling methods to prevent null-value polling

	// Override getName to use REST API instead of sending null values
	getName(): void {
		this.getReceiverName()
			.then((name) => {
				this.name = name
				this.publishVariableValues()
			})
			.catch((error) => {
				console.log('error', `Failed to get device name via SCPv2: ${error}`)
			})
	}

	// Override getStaticInformation to use REST API calls
	getStaticInformation(): void {
		console.log(`[SCPv2] getStaticInformation called - delegating to async method`)
		this.getStaticInformationAsync().catch((error) => {
			console.log(`[SCPv2] Failed to get static information: ${error}`)
		})
	}

	// Override initSubscriptions to prevent SCPv1 subscription attempts
	initSubscriptions(): void {
		// SCPv2 subscriptions are handled via SSE in startSubscription()
		// No need for manual subscription setup like in SCPv1
		console.log('debug', 'SCPv2 subscriptions handled via SSE - skipping SCPv1 subscription init')
	}

	// Override sendMessage to prevent any SCPv1 UDP messages
	public sendMessage(_message: string): void {
		// This method is not used in SCPv2 - commands are sent via REST API
		console.log('debug', 'sendMessage called but not used in SCPv2 - ignoring')
	}

	// Override sendCommand to prevent any SCPv1 UDP commands
	public sendCommand(_path: string, _value: boolean | number | string | object | null): void {
		// This method is not used in SCPv2 - commands are sent via REST API
		console.log('debug', 'sendCommand called but not used in SCPv2 - ignoring')
	}
}
