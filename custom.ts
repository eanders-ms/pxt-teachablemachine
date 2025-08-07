//% namespace="Teachable Machine"
namespace Teachable_Machine {
    const SIMX_CHANNEL = "eanders-ms/pxt-teachablemachine"

    function postExtensionMessage(msg: any) {
        control.simmessages.send(SIMX_CHANNEL, Buffer.fromUTF8(JSON.stringify(msg)), false);
    }

    let stringMessageHandler: (val: string) => void;

    //% block
    //% draggableParameters="reporter"
    export function onReceiveString(handler: (val: string) => void) {
        stringMessageHandler = handler;
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
