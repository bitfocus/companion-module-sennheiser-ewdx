import { InstanceBase, runEntrypoint, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdateVariableDefinitions } from './variables.js'
import { EWDXReceiver } from './receiver.js'
import { UpdatePresets } from './presets.js'

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig
	receiver!: EWDXReceiver

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config
		this.initReceiver()
	}

	async destroy(): Promise<void> {
		this.log('debug', 'destroy')
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.initReceiver()
	}

	initReceiver(): void {
		if (this.config.host != null && this.config.host != '') {
			this.receiver = new EWDXReceiver(this, this.config.model, this.config.host)
			this.updateStatus(InstanceStatus.Ok)

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
