//% color="#1967D2"
namespace Teachable_Machine {
    const SIMX_CHANNEL = "eanders-ms/pxt-teachablemachine"

    interface Prediction {
        name: string;
        confidence: number;
        model: string;
    }

    interface PredictionMessage {
        type: "predictions";
        modelType: "image" | "pose" | "sound";
        predictions: Prediction[];
    }

    function postExtensionMessage(msg: any) {
        control.simmessages.send(SIMX_CHANNEL, Buffer.fromUTF8(JSON.stringify(msg)), false);
    }

    const poseHandlers: ((name: string, confidence: number, model: string) => void)[] = [];
    const imageHandlers: ((name: string, confidence: number, model: string) => void)[] = [];
    const soundHandlers: ((name: string, confidence: number, model: string) => void)[] = [];

    //% block
    //% draggableParameters="reporter"
    export function onSoundPrediction(handler: (label: string, prediction: number, model: string) => void) {
        soundHandlers.push(handler);
    }

    //% block
    //% draggableParameters="reporter"
    export function onImagePrediction(handler: (label: string, prediction: number, model: string) => void) {
        imageHandlers.push(handler);
    }

    //% block
    //% draggableParameters="reporter"
    export function onPosePrediction(handler: (label: string, prediction: number, model: string) => void) {
        poseHandlers.push(handler);
    }

    //% block="get prediction for label $label from model $model=variables_get(model)"
    //% blockSetVariable=prediction
    //% label.defl="(class label)"
    export function getPredictionForLabel_assign(model: string, label: string): number {
        // TODO
        return 0;
    }

    //% block="get labels for model $model=variables_get(model)"
    //% blockSetVariable=labels
    export function getLabelsForModel_assign(model: string): string[] {
        // TODO
        return [];
    }

    //% block="load model from url $url"
    //% blockSetVariable=model
    //% url.defl="(model url)"
    export function loadModelFromUrl_assign(url: string): string {
        // TODO
        return "";
    }

    function emitPosePredictions(predictions: Prediction[]) {
        predictions.forEach(prediction => {
            poseHandlers.forEach(handler => handler(prediction.name, prediction.confidence, prediction.model));
        });
    }

    function emitImagePredictions(predictions: Prediction[]) {
        predictions.forEach(prediction => {
            imageHandlers.forEach(handler => handler(prediction.name, prediction.confidence, prediction.model));
        });
    }

    function emitSoundPredictions(predictions: Prediction[]) {
        predictions.forEach(prediction => {
            soundHandlers.forEach(handler => handler(prediction.name, prediction.confidence, prediction.model));
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
