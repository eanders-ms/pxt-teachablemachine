//% color="#1967D2"
namespace Teachable_Machine {
    const SIMX_CHANNEL = "eanders-ms/pxt-teachablemachine"

    interface Prediction {
        name: string;
        confidence: number;
    }

    interface PredictionMessage {
        type: "predictions";
        modelType: "image" | "pose" | "sound";
        predictions: Prediction[];
    }

    function postExtensionMessage(msg: any) {
        control.simmessages.send(SIMX_CHANNEL, Buffer.fromUTF8(JSON.stringify(msg)), false);
    }

    const poseHandlers: ((name: string, confidence: number) => void)[] = [];
    const imageHandlers: ((name: string, confidence: number) => void)[] = [];
    const soundHandlers: ((name: string, confidence: number) => void)[] = [];

    //% block
    //% draggableParameters="reporter"
    export function onPosePrediction(handler: (name: string, confidence: number) => void) {
        poseHandlers.push(handler);
    }

    //% block
    //% draggableParameters="reporter"
    export function onImagePrediction(handler: (name: string, confidence: number) => void) {
        imageHandlers.push(handler);
    }

    //% block
    //% draggableParameters="reporter"
    export function onSoundPrediction(handler: (name: string, confidence: number) => void) {
        soundHandlers.push(handler);
    }

    function emitPosePredictions(predictions: Prediction[]) {
        predictions.forEach(prediction => {
            poseHandlers.forEach(handler => handler(prediction.name, prediction.confidence));
        });
    }

    function emitImagePredictions(predictions: Prediction[]) {
        predictions.forEach(prediction => {
            imageHandlers.forEach(handler => handler(prediction.name, prediction.confidence));
        });
    }

    function emitSoundPredictions(predictions: Prediction[]) {
        predictions.forEach(prediction => {
            soundHandlers.forEach(handler => handler(prediction.name, prediction.confidence));
        });
    }

    function handleSimxMessage(b: Buffer) {
        const s = b.toString();
        const msg = JSON.parse(s);
        if (!msg.type) return;
        switch (msg.type) {
            case "hello": {
                postExtensionMessage({ type: "init" });
                break;
            }
            case "ping": {
                postExtensionMessage({ type: "pong" });
                break;
            }
            case "pong": {
                break;
            }
            case "predictions": {
                const predMsg = msg as PredictionMessage;
                switch (predMsg.modelType) {
                    case "pose": {
                        emitPosePredictions(predMsg.predictions);
                        break;
                    }
                    case "image": {
                        emitImagePredictions(predMsg.predictions);
                        break;
                    }
                    case "sound": {
                        emitSoundPredictions(predMsg.predictions);
                        break;
                    }
                }
            }
        }
    }

    /**
     * Register to receive simx messages
     */
    //% shim=TD_NOOP
    function registerSimx() {
        control.simmessages.onReceived(SIMX_CHANNEL, handleSimxMessage)
        // Posting this message will trigger load of the simx. It is unlikely to be received due to race conditions.
        postExtensionMessage({ type: "init" });
    }

    // Register simulator extension on load
    registerSimx();
}
