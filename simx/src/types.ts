export type ActionBase<Type extends string, Payload = unknown> = {
    type: Type;
    payload: Payload;
};

export type ModalOptions = {};

// MakeCode Simulator Message Types
// See https://github.com/microsoft/pxt/blob/master/pxtsim/embed.ts

export interface SimulatorMessage {
    type: string
    // who created this message
    source?: string
}

export interface SimulatorBroadcastMessage extends SimulatorMessage {
    broadcast: boolean
    toParentIFrameOnly?: boolean
    srcFrameIndex?: number
}

export interface SimulatorControlMessage extends SimulatorBroadcastMessage {
    type: "messagepacket"
    channel: string
    data: Uint8Array
}
