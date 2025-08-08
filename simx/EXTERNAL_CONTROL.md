# External Model Control System

This document describes the refactoring that enables external control of Teachable Machine models loaded in the React application.

## Overview

The system has been refactored to support external automation and control of Teachable Machine models through a centralized model management system. This allows external scripts, parent windows, iframes, or other applications to programmatically:

- Load models from Teachable Machine URLs
- Start and stop models  
- Monitor model states and changes
- Receive model prediction data
- Control multiple models simultaneously

## Architecture

### Core Components

1. **ModelManager** (`src/services/modelManager.ts`)
   - Central registry for all loaded models
   - Manages model lifecycle and state
   - Provides external control interface
   - Handles message-based commands

2. **ModelControls Interface**
   - Standardized interface for model operations
   - Implemented by each model component
   - Provides start, stop, isRunning, isLoaded methods

3. **External API** (`src/api/index.ts`)
   - Public interface for external consumers
   - Wraps ModelManager functionality
   - Exposed on window object for global access

4. **Component Integration**
   - ImageModel and PoseModel register with ModelManager
   - Expose standardized control interfaces
   - Maintain React state while allowing external control

### Data Flow

```
External Code → TeachableMachineAPI → ModelManager → Component Controls → React State
                     ↓
              Message System → ModelManager → React State Updates
```

## Implementation Details

### Model Registration

Each model component registers itself with the ModelManager when loaded:

```typescript
useEffect(() => {
    const controls: ModelControls = {
        start: handleStart,
        stop: handleStop,
        isRunning: () => runningRef.current,
        isLoaded: () => modelLoaded && modelRef.current !== null,
    };

    if (modelLoaded) {
        modelManager.registerModel(item, controls);
    }

    return () => {
        modelManager.unregisterModel(item.id);
    };
}, [modelLoaded, item]);
```

### External API Interface

```typescript
interface TeachableMachineAPI {
    loadModel(url: string): Promise<boolean>;
    startModel(modelId: string): Promise<boolean>;
    stopModel(modelId: string): boolean;
    stopAllModels(): void;
    deleteModel(modelId: string): boolean;
    getModels(): ModelInfo[];
    sendMessage(message: ModelMessage): Promise<boolean>;
    onModelsChange(callback: (models: ModelInfo[]) => void): () => void;
}
```

### Message System

Supports message-based control for integration with external systems:

```typescript
type ModelMessage = 
    | { type: 'load-model'; url: string }
    | { type: 'start-model'; modelId: string }
    | { type: 'stop-model'; modelId: string }
    | { type: 'stop-all-models' }
    | { type: 'delete-model'; modelId: string };
```

## Usage Examples

### Direct API Access

```javascript
// Load a model
await window.teachableMachineAPI.loadModel(
    'https://teachablemachine.withgoogle.com/models/abc123/'
);

// Start the model
await window.teachableMachineAPI.startModel('abc123');

// Monitor models
const models = window.teachableMachineAPI.getModels();
console.log(models); // Array of model info objects
```

### Message-Based Control

```javascript
// Send command messages
await window.teachableMachineAPI.sendMessage({
    type: 'load-model',
    url: 'https://teachablemachine.withgoogle.com/models/abc123/'
});

await window.teachableMachineAPI.sendMessage({
    type: 'start-model',
    modelId: 'abc123'
});
```

### State Monitoring

```javascript
// Subscribe to model changes
const unsubscribe = window.teachableMachineAPI.onModelsChange((models) => {
    console.log('Models updated:', models);
    
    // Auto-start loaded models
    models.forEach(model => {
        if (model.isLoaded && !model.isRunning) {
            window.teachableMachineAPI.startModel(model.id);
        }
    });
});
```

## Integration Scenarios

### 1. Parent Window Control

Parent window controlling embedded iframe:

```javascript
// In parent window
const iframe = document.getElementById('teachableMachineFrame');
const api = iframe.contentWindow.teachableMachineAPI;

await api.loadModel('https://teachablemachine.withgoogle.com/models/model1/');
await api.startModel('model1');
```

### 2. PostMessage Integration

Cross-origin communication via PostMessage:

```javascript
// Send commands to iframe
iframe.contentWindow.postMessage({
    type: 'teachable-machine-load',
    url: 'https://teachablemachine.withgoogle.com/models/model1/'
}, '*');

// Listen for responses
window.addEventListener('message', (event) => {
    if (event.data.type === 'teachable-machine-status') {
        console.log('Model status:', event.data);
    }
});
```

### 3. Automation Scripts

Batch operations and automation:

```javascript
async function setupEnvironment() {
    const models = [
        'https://teachablemachine.withgoogle.com/models/gesture1/',
        'https://teachablemachine.withgoogle.com/models/pose1/',
        'https://teachablemachine.withgoogle.com/models/image1/'
    ];
    
    // Load all models
    for (const url of models) {
        await window.teachableMachineAPI.loadModel(url);
    }
    
    // Wait for loading
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Start all models
    const loadedModels = window.teachableMachineAPI.getModels();
    for (const model of loadedModels) {
        if (model.isLoaded) {
            await window.teachableMachineAPI.startModel(model.id);
        }
    }
}
```

### 4. External System Integration

Integration with LMS, CMS, or other educational platforms:

```javascript
// Educational platform integration
class TeachableMachineIntegration {
    constructor() {
        this.api = window.teachableMachineAPI;
        this.setupEventListeners();
    }
    
    async loadLessonModels(lessonConfig) {
        for (const modelConfig of lessonConfig.models) {
            await this.api.loadModel(modelConfig.url);
        }
    }
    
    async startActivity(activityId) {
        const modelsToStart = this.getModelsForActivity(activityId);
        for (const modelId of modelsToStart) {
            await this.api.startModel(modelId);
        }
    }
    
    setupEventListeners() {
        this.api.onModelsChange((models) => {
            this.updateLearningDashboard(models);
        });
    }
}
```

## Benefits

### 1. **Separation of Concerns**
- UI logic remains in React components
- External control logic is separate
- Clear interfaces between systems

### 2. **Flexibility**
- Multiple integration patterns supported
- Message-based and direct API access
- Works with any external JavaScript environment

### 3. **State Management**
- Centralized model state tracking
- Consistent state across UI and external systems
- Event-driven updates

### 4. **Scalability**
- Multiple models can be controlled simultaneously
- Subscription-based change notifications
- Efficient message handling

## Technical Considerations

### 1. **Cross-Origin Access**
- API access requires same-origin or proper CORS setup
- PostMessage provides cross-origin alternative
- Consider security implications of global exposure

### 2. **Error Handling**
- All API methods return success indicators
- Async operations use Promise patterns
- Comprehensive error logging

### 3. **Memory Management**
- Proper cleanup when models are removed
- Event listener cleanup on component unmount
- Subscription management for external listeners

### 4. **Type Safety**
- Full TypeScript support throughout
- Strongly typed message interfaces
- Type-safe external API definitions

## Files Modified/Added

### Core System Files
- `src/services/modelManager.ts` - Central model management
- `src/api/index.ts` - External API interface
- `src/api/examples.ts` - Usage examples
- `src/api/README.md` - API documentation

### Component Updates
- `src/components/PoseModel.tsx` - Added model registration
- `src/components/ImageModel.tsx` - Added model registration
- `src/components/types.ts` - Added metadata types
- `src/components/index.ts` - Export type definitions

### Application Integration
- `src/App.tsx` - Connected to model manager
- `src/types.ts` - Added metadata interfaces

### Documentation & Demo
- `demo.html` - Interactive demonstration
- `src/api/README.md` - Complete API documentation

## Future Enhancements

1. **Model Templates** - Predefined model configurations
2. **Batch Operations** - Bulk model loading and control
3. **Performance Monitoring** - Model performance metrics
4. **Custom Events** - Extended event system for predictions
5. **Configuration Persistence** - Save/load model configurations
6. **Advanced Automation** - Scripting engine for complex workflows

This refactoring provides a solid foundation for external model control while maintaining the existing React-based user interface.
