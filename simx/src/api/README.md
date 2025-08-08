# External API for Teachable Machine Models

This document describes how to control the Teachable Machine system from outside the React application using the exposed API.

## Overview

The system now provides a centralized model management system that allows external code to:
- Load models programmatically
- Start and stop models
- Monitor model states
- Receive model predictions

## Global API Access

After the application loads, the API is available on the global window object:

```javascript
// Check if API is available
if (window.teachableMachineAPI) {
    console.log('Teachable Machine API is ready');
}
```

## API Methods

### Loading Models

```javascript
// Load a model from a Teachable Machine URL
await window.teachableMachineAPI.loadModel('https://teachablemachine.withgoogle.com/models/YOUR_MODEL_ID/');
```

### Starting and Stopping Models

```javascript
// Start a specific model (model ID is extracted from the URL path)
await window.teachableMachineAPI.startModel('YOUR_MODEL_ID');

// Stop a specific model
window.teachableMachineAPI.stopModel('YOUR_MODEL_ID');

// Stop all running models
window.teachableMachineAPI.stopAllModels();
```

### Model Information

```javascript
// Get all loaded models
const models = window.teachableMachineAPI.getModels();
console.log(models);
// Output: Array of {id, modelType, url, isLoaded, isRunning}
```

### Deleting Models

```javascript
// Remove a model from the system
window.teachableMachineAPI.deleteModel('YOUR_MODEL_ID');
```

### Message-Based Control

You can also use a message-based approach:

```javascript
// Load model
await window.teachableMachineAPI.sendMessage({
    type: 'load-model',
    url: 'https://teachablemachine.withgoogle.com/models/YOUR_MODEL_ID/'
});

// Start model
await window.teachableMachineAPI.sendMessage({
    type: 'start-model',
    modelId: 'YOUR_MODEL_ID'
});

// Stop model
await window.teachableMachineAPI.sendMessage({
    type: 'stop-model',
    modelId: 'YOUR_MODEL_ID'
});

// Stop all models
await window.teachableMachineAPI.sendMessage({
    type: 'stop-all-models'
});

// Delete model
await window.teachableMachineAPI.sendMessage({
    type: 'delete-model',
    modelId: 'YOUR_MODEL_ID'
});
```

### Monitoring Model Changes

```javascript
// Subscribe to model state changes
const unsubscribe = window.teachableMachineAPI.onModelsChange((models) => {
    console.log('Models updated:', models);
    
    // Example: Auto-start loaded models
    models.forEach(model => {
        if (model.isLoaded && !model.isRunning) {
            window.teachableMachineAPI.startModel(model.id);
        }
    });
});

// Unsubscribe when no longer needed
unsubscribe();
```

## Model Types

The system supports three types of Teachable Machine models:

1. **Image Classification** (`modelType: "image"`)
   - Classifies images from webcam or uploaded files
   
2. **Pose Detection** (`modelType: "pose"`)
   - Detects body poses and classifies them
   - Includes visual overlay of detected keypoints
   
3. **Sound Classification** (`modelType: "sound"`)
   - Classifies audio from microphone input

## External Integration Examples

### PostMessage API Integration

```javascript
// Send commands from parent window or iframe
window.postMessage({
    type: 'teachable-machine-load',
    url: 'https://teachablemachine.withgoogle.com/models/YOUR_MODEL_ID/'
}, '*');

window.postMessage({
    type: 'teachable-machine-start',
    modelId: 'YOUR_MODEL_ID'
}, '*');

window.postMessage({
    type: 'teachable-machine-list'
}, '*');

// Listen for responses
window.addEventListener('message', (event) => {
    if (event.data.type === 'teachable-machine-models') {
        console.log('Available models:', event.data.models);
    }
});
```

### Automation Scripts

```javascript
// Automation example: Load and start multiple models
async function setupModels() {
    const modelUrls = [
        'https://teachablemachine.withgoogle.com/models/MODEL_1/',
        'https://teachablemachine.withgoogle.com/models/MODEL_2/',
    ];
    
    // Load all models
    for (const url of modelUrls) {
        await window.teachableMachineAPI.loadModel(url);
    }
    
    // Wait for models to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start all loaded models
    const models = window.teachableMachineAPI.getModels();
    for (const model of models) {
        if (model.isLoaded && !model.isRunning) {
            await window.teachableMachineAPI.startModel(model.id);
        }
    }
}
```

## Console Examples

For quick testing, examples are available in the browser console:

```javascript
// Access examples
window.teachableMachineExamples.loadExampleModel();
window.teachableMachineExamples.listModelsExample();
window.teachableMachineExamples.automationWorkflow();
```

## Error Handling

All API methods return promises or boolean values to indicate success:

```javascript
try {
    const success = await window.teachableMachineAPI.loadModel(url);
    if (!success) {
        console.error('Failed to load model');
    }
} catch (error) {
    console.error('Error:', error);
}
```

## Model ID Extraction

The model ID is extracted from the Teachable Machine URL:
- URL: `https://teachablemachine.withgoogle.com/models/abc123/`
- Model ID: `abc123`

## Notes

- Models must be public Teachable Machine models
- The system handles webcam permissions automatically
- Model predictions are sent to the MakeCode extension if available
- Multiple models can run simultaneously
- Models maintain their state independently
