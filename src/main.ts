import { InstanceBase, runEntrypoint, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdateVariableDefinitions } from './variables.js'
import { DeviceModel, EWDXBase } from './ewdx.js'
import { UpdatePresets } from './presets.js'
import { CHG70N } from './chg70n.js'
import { EWDXReceiver } from './ewdxReceiver.js'
import { EWDXReceiverSCPv2 } from './ewdxReceiverSCPv2.js'

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig
	device!: EWDXBase

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config
		this.initReceiver()
	}

	async destroy(): Promise<void> {
		this.log('debug', 'destroy')
		if (this.device) {
			this.device.destroy()
		}
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.initReceiver()
	}

	initReceiver(): void {
		if (this.config.host != null && this.config.host != '') {
			// Destroy existing device if it exists
			if (this.device) {
				this.device.destroy()
			}

			// CHG70N only supports SCPv1
			if (this.config.model === DeviceModel.CHG70N) {
				this.device = new CHG70N(this, this.config.host)
				this.updateStatus(InstanceStatus.Connecting)
			} else {
				// EM devices support both protocols
				if (this.config.protocol === 'SCPv2') {
					// Validate third party password for SCPv2
					if (!this.config.thirdPartyPassword || this.config.thirdPartyPassword.trim() === '') {
						this.updateStatus(InstanceStatus.BadConfig, 'Third party password required for SCPv2!')
						return
					}
					this.device = new EWDXReceiverSCPv2(this, this.config.model, this.config.host, this.config.thirdPartyPassword)
					// SCPv2 handles its own status updates asynchronously - don't override here
				} else {
					this.device = new EWDXReceiver(this, this.config.model, this.config.host)
					this.updateStatus(InstanceStatus.Connecting)
				}
			}
			this.updateActions()
			this.updateFeedbacks()
			this.updateVariableDefinitions()
			this.updatePresets()
		} else {
			this.updateStatus(InstanceStatus.BadConfig, 'Missing IP address!')
		}
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
