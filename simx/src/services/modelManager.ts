import { ListItem } from "@/components/types";

export interface ModelControls {
    start: () => Promise<void>;
    stop: () => void;
    isRunning: () => boolean;
    isLoaded: () => boolean;
}

export interface ModelInstance {
    item: ListItem;
    controls: ModelControls;
}

export interface LoadModelMessage {
    type: 'load-model';
    url: string;
}

export interface StartModelMessage {
    type: 'start-model';
    modelId: string;
}

export interface StopModelMessage {
    type: 'stop-model';
    modelId: string;
}

export interface StopAllModelsMessage {
    type: 'stop-all-models';
}

export interface DeleteModelMessage {
    type: 'delete-model';
    modelId: string;
}

export type ModelMessage = LoadModelMessage | StartModelMessage | StopModelMessage | StopAllModelsMessage | DeleteModelMessage;

export class ModelManager {
    private models = new Map<string, ModelInstance>();
    private listeners = new Set<(models: Map<string, ModelInstance>) => void>();

    // Register a model with its controls
    registerModel(item: ListItem, controls: ModelControls) {
        this.models.set(item.id, { item, controls });
        this.notifyListeners();
    }

    // Unregister a model
    unregisterModel(modelId: string) {
        this.models.delete(modelId);
        this.notifyListeners();
    }

    // Get a specific model
    getModel(modelId: string): ModelInstance | undefined {
        return this.models.get(modelId);
    }

    // Get all models
    getAllModels(): ModelInstance[] {
        return Array.from(this.models.values());
    }

    // Start a specific model
    async startModel(modelId: string): Promise<boolean> {
        const model = this.models.get(modelId);
        if (!model) {
            console.warn(`Model not found: ${modelId}`);
            return false;
        }

        if (!model.controls.isLoaded()) {
            console.warn(`Model not loaded: ${modelId}`);
            return false;
        }

        if (model.controls.isRunning()) {
            console.warn(`Model already running: ${modelId}`);
            return true;
        }

        try {
            await model.controls.start();
            return true;
        } catch (error) {
            console.error(`Failed to start model ${modelId}:`, error);
            return false;
        }
    }

    // Stop a specific model
    stopModel(modelId: string): boolean {
        const model = this.models.get(modelId);
        if (!model) {
            console.warn(`Model not found: ${modelId}`);
            return false;
        }

        if (!model.controls.isRunning()) {
            console.warn(`Model not running: ${modelId}`);
            return true;
        }

        try {
            model.controls.stop();
            return true;
        } catch (error) {
            console.error(`Failed to stop model ${modelId}:`, error);
            return false;
        }
    }

    // Stop all models
    stopAllModels(): void {
        for (const [modelId, model] of this.models) {
            if (model.controls.isRunning()) {
                try {
                    model.controls.stop();
                } catch (error) {
                    console.error(`Failed to stop model ${modelId}:`, error);
                }
            }
        }
    }

    // Load a new model (this will trigger React state update)
    async loadModel(url: string): Promise<boolean> {
        // This will be handled by the App component through the listener system
        this.notifyModelLoadRequest(url);
        return true;
    }

    // Delete a model
    deleteModel(modelId: string): boolean {
        const model = this.models.get(modelId);
        if (!model) {
            console.warn(`Model not found: ${modelId}`);
            return false;
        }

        // Stop the model if it's running
        if (model.controls.isRunning()) {
            model.controls.stop();
        }

        // Notify the App component to remove it from React state
        this.notifyModelDeleteRequest(modelId);
        return true;
    }

    // Process external messages
    async handleMessage(message: ModelMessage): Promise<boolean> {
        switch (message.type) {
            case 'load-model':
                return await this.loadModel(message.url);
            case 'start-model':
                return await this.startModel(message.modelId);
            case 'stop-model':
                return this.stopModel(message.modelId);
            case 'stop-all-models':
                this.stopAllModels();
                return true;
            case 'delete-model':
                return this.deleteModel(message.modelId);
            default:
                console.warn('Unknown message type:', message);
                return false;
        }
    }

    // Subscribe to model changes
    subscribe(listener: (models: Map<string, ModelInstance>) => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    // Subscribe to model load requests
    onModelLoadRequest(callback: (url: string) => void) {
        this.modelLoadCallback = callback;
    }

    // Subscribe to model delete requests
    onModelDeleteRequest(callback: (modelId: string) => void) {
        this.modelDeleteCallback = callback;
    }

    private modelLoadCallback?: (url: string) => void;
    private modelDeleteCallback?: (modelId: string) => void;

    private notifyListeners() {
        for (const listener of this.listeners) {
            listener(new Map(this.models));
        }
    }

    private notifyModelLoadRequest(url: string) {
        if (this.modelLoadCallback) {
            this.modelLoadCallback(url);
        }
    }

    private notifyModelDeleteRequest(modelId: string) {
        if (this.modelDeleteCallback) {
            this.modelDeleteCallback(modelId);
        }
    }
}

// Global instance
export const modelManager = new ModelManager();

// Expose to window for external access
if (typeof window !== 'undefined') {
    (window as any).modelManager = modelManager;
}
