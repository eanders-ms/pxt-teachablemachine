import { SimulatorMessage, SimulatorControlMessage } from "@/types"

const SIMX_CHANNEL = "eanders-ms/pxt-teachablemachine"

type PingMessage = {
    type: "ping"
};
type PongMessage = {
    type: "pong"
};
type HelloMessage = {
    type: "hello"
};
type InitMessage = {
    type: "init"
};
type ExtensionMessage = PingMessage | PongMessage | HelloMessage | InitMessage;

// Sends a message to this project's code extension running in the MakeCode simulator
export function postExtensionMessage(msg: ExtensionMessage) {
    const payload = new TextEncoder().encode(JSON.stringify(msg))
    const packet: Partial<SimulatorControlMessage> = {
        type: "messagepacket",
        channel: SIMX_CHANNEL,
        data: payload,
    }
    window.parent.postMessage(packet, "*")
}

// Handle a message from this project's code extension
const receiveExtensionMessage = (msg: ExtensionMessage) => {
    switch (msg.type) {
        case "ping":
            postExtensionMessage({ type: "pong" })
            console.log("Teachable Machine simx ping received, sent pong")
            break
        case "pong":
            console.log("Teachable Machine simx pong received")
            break
        case "init":
            console.log("Teachable Machine simx init received")
            break
    }
}

// Handle a SimulatorControlMessage from MakeCode
const receiveSimControlMessage = (simmsg: SimulatorControlMessage) => {
    // Cross-frame communication is overly chatty right now, so we must filter out unwanted messages here.
    // TODO (MakeCode): Clean up iframe messaging to reduce noise.
    const srcFrameIndex = (simmsg.srcFrameIndex as number) ?? -1
    const fromPrimarySim = srcFrameIndex === 0
    if (!fromPrimarySim) {
        // Ignore messages from other simulator extensions
        return
    }
    if (simmsg.channel !== SIMX_CHANNEL) {
        // Ignore messages on other channels
        return
    }
    // looks like a message from our code extension
    const data = new TextDecoder().decode(new Uint8Array(simmsg.data))
    const msg = JSON.parse(data) as ExtensionMessage
    receiveExtensionMessage(msg)
}

// Handle a SimulatorMessage from MakeCode
const receiveSimMessage = (simmsg: SimulatorMessage) => {
    switch (simmsg.type) {
        case "messagepacket":
            // looks like a SimulatorControlMessage
            return receiveSimControlMessage(simmsg as SimulatorControlMessage)
        default:
            // This is here to reveal how many other kinds of messages are being sent.
            // TODO (MakeCode): Document the other message types. Some of them are useful.
            // 🛠️ TASK: Handle other message types as needed.
            // 🛠️ TASK: Comment out this line in a real project.
            console.log("Received unknown simmsg", simmsg.type)
    }
}

// Handle messages from the parent window
const receiveMessage = (ev: MessageEvent) => {
    const { data } = ev
    const { type } = data
    if (!data || !type) return
    // Looks like a SimulatorMessage from MakeCode
    receiveSimMessage(data as SimulatorMessage)
}

export function startup() {
    window.addEventListener("message", receiveMessage)
    postExtensionMessage({ type: "hello" })
}

export function shutdown() {
    window.removeEventListener("message", receiveMessage)
}
