import { modelManager, ModelMessage } from "@/services/modelManager";

/**
 * External API for controlling Teachable Machine models from outside the React application.
 * This API can be accessed via window.teachableMachineAPI or through direct imports.
 */
export interface TeachableMachineAPI {
    /**
     * Load a new model from a URL
     * @param url The base URL of the Teachable Machine model (without model.json)
     * @returns Promise<boolean> indicating success
     */
    loadModel(url: string): Promise<boolean>;

    /**
     * Start a specific model by its ID
     * @param modelId The ID of the model to start
     * @returns Promise<boolean> indicating success
     */
    startModel(modelId: string): Promise<boolean>;

    /**
     * Stop a specific model by its ID
     * @param modelId The ID of the model to stop
     * @returns boolean indicating success
     */
    stopModel(modelId: string): boolean;

    /**
     * Stop all currently running models
     */
    stopAllModels(): void;

    /**
     * Delete a model by its ID
     * @param modelId The ID of the model to delete
     * @returns boolean indicating success
     */
    deleteModel(modelId: string): boolean;

    /**
     * Get information about all loaded models
     * @returns Array of model information including ID, type, URL, and status
     */
    getModels(): ModelInfo[];

    /**
     * Process a control message
     * @param message The message to process
     * @returns Promise<boolean> indicating success
     */
    sendMessage(message: ModelMessage): Promise<boolean>;

    /**
     * Subscribe to model changes
     * @param callback Function to call when models change
     * @returns Unsubscribe function
     */
    onModelsChange(callback: (models: ModelInfo[]) => void): () => void;
}

export interface ModelInfo {
    id: string;
    modelType: string;
    url: string;
    isLoaded: boolean;
    isRunning: boolean;
}

class TeachableMachineAPIImpl implements TeachableMachineAPI {
    async loadModel(url: string): Promise<boolean> {
        return await modelManager.loadModel(url);
    }

    async startModel(modelId: string): Promise<boolean> {
        return await modelManager.startModel(modelId);
    }

    stopModel(modelId: string): boolean {
        return modelManager.stopModel(modelId);
    }

    stopAllModels(): void {
        modelManager.stopAllModels();
    }

    deleteModel(modelId: string): boolean {
        return modelManager.deleteModel(modelId);
    }

    getModels(): ModelInfo[] {
        return modelManager.getAllModels().map(model => ({
            id: model.item.id,
            modelType: model.item.modelType,
            url: model.item.url,
            isLoaded: model.controls.isLoaded(),
            isRunning: model.controls.isRunning(),
        }));
    }

    async sendMessage(message: ModelMessage): Promise<boolean> {
        return await modelManager.handleMessage(message);
    }

    onModelsChange(callback: (models: ModelInfo[]) => void): () => void {
        return modelManager.subscribe((modelsMap) => {
            const models = Array.from(modelsMap.values()).map(model => ({
                id: model.item.id,
                modelType: model.item.modelType,
                url: model.item.url,
                isLoaded: model.controls.isLoaded(),
                isRunning: model.controls.isRunning(),
            }));
            callback(models);
        });
    }
}

// Create the API instance
export const teachableMachineAPI = new TeachableMachineAPIImpl();

// Expose to window for external access
if (typeof window !== 'undefined') {
    (window as any).teachableMachineAPI = teachableMachineAPI;
}

// Example usage:
// window.teachableMachineAPI.loadModel('https://teachablemachine.withgoogle.com/models/abc123/');
// window.teachableMachineAPI.startModel('abc123');
// window.teachableMachineAPI.stopModel('abc123');
// window.teachableMachineAPI.getModels();
