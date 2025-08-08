export type ActionBase<Type extends string, Payload = unknown> = {
    type: Type;
    payload: Payload;
};

export type ModalOptions = {};

// Teachable Machine Metadata Types
export interface ImageOrPoseMetadata {
    tfjsVersion: string;
    packageName: string;
    packageVersion: string;
    labels: string[];
    imageSize: number;
    weightUrl?: string;
    modelUrl?: string;
}

export interface SoundMetadata {
    tfjsSpeechCommandsVersion: string;
    modelName: string;
    timeSteps: number;
    wordLabels: string[];
    vocab: string[];
    frameSize: number;
    sampleRate: number;
    keywords?: string[];
}

// MakeCode Simulator Message Types
// See https://github.com/microsoft/pxt/blob/master/pxtsim/embed.ts

export interface SimulatorMessage {
    type: string;
    // who created this message
    source?: string;
}

export interface SimulatorBroadcastMessage extends SimulatorMessage {
    broadcast: boolean;
    toParentIFrameOnly?: boolean;
    srcFrameIndex?: number;
}

export interface SimulatorControlMessage extends SimulatorBroadcastMessage {
    type: "messagepacket";
    channel: string;
    data: Uint8Array;
}
