import { useState, useEffect, useRef } from "react";
import { classList } from "@/utils";
import css from "./App.module.scss";

interface ListItem {
    id: string;
    url: string;
}

interface ListItemProps {
    item: ListItem;
    onDelete: (id: string) => void;
}

interface ModelLabel {
    title: string;
    confidence: number;
}

function ModelItem({ item, onDelete }: ListItemProps) {
    const [modelName, setModelName] = useState("loading...");
    const [modelType, setModelType] = useState<string | undefined>(undefined);
    const [labels, setLabels] = useState<ModelLabel[]>([]);
    const [running, setRunning] = useState(false);
    const [modelLoaded, setModelLoaded] = useState(false);
    const imageModelRef = useRef<tmImage.Model | null>(null);
    const webcamRef = useRef<tmImage.Webcam | null>(null);
    const canvasContainerRef = useRef<HTMLDivElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const runningRef = useRef<boolean>(false); // Add ref for running state
    const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string>("");
    const [flipCamera, setFlipCamera] = useState<boolean>(false);

    useEffect(() => {
        if (modelLoaded || !canvasContainerRef.current) return;
        console.log("Loading model from URL:", item.url);
        setModelLoaded(true); // Set model as loaded early to prevent multiple loads
        const resourceUrl = new URL(item.url);
        let pathname = resourceUrl.pathname;
        if (pathname.endsWith("/")) {
            pathname = pathname.slice(0, -1);
        }
        const loadModel = async () => {
            try {
                console.log("Fetching model files...");
                const model = await window.tmImage.load(
                    resourceUrl.toString() + "model.json",
                    resourceUrl.toString() + "metadata.json"
                );
                console.log("Model loaded successfully:", model);
                return model;
            } catch (error) {
                console.error("Error loading model:", error);
                throw error;
            }
        };
        loadModel()
            .then((model) => {
                const modelName = pathname.split("/").pop() || "Untitled Model";
                const modelType = model._metadata["packageName"]?.split("/").pop() || "Unknown";
                console.log("Model details - Name:", modelName, "Type:", modelType);

                setModelName(modelName);
                setModelType(modelType);
                const labelsArray: ModelLabel[] =
                    model._metadata["labels"]?.map((label: string) => ({
                        title: label,
                        confidence: 0,
                    })) || [];
                console.log("Model labels:", labelsArray);
                setLabels(labelsArray);
                imageModelRef.current = model;
            })
            .catch((error) => {
                console.error("Failed to load model:", error);
                setModelLoaded(false);
            });
        // Load the image model if available
    }, [item.url, modelLoaded]);

    // Enumerate available cameras
    useEffect(() => {
        const getCameras = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter((device) => device.kind === "videoinput");
                setAvailableCameras(videoDevices);

                // Set default camera if none selected
                if (videoDevices.length > 0 && !selectedCameraId) {
                    setSelectedCameraId(videoDevices[0].deviceId);
                }
            } catch (error) {
                console.error("Error enumerating cameras:", error);
            }
        };

        getCameras();
    }, [selectedCameraId]);

    const predict = async () => {
        if (webcamRef.current && imageModelRef.current && webcamRef.current.canvas) {
            try {
                webcamRef.current.update();
                const prediction = await imageModelRef.current.predict(webcamRef.current.canvas);

                setLabels((prevLabels) =>
                    prevLabels.map((label, index) => ({
                        ...label,
                        confidence: prediction[index] ? Number(prediction[index].probability.toFixed(3)) : 0,
                    }))
                );
            } catch (error) {
                console.error("Error during prediction:", error);
            }
        } else {
            console.log("Predict skipped - missing dependencies");
        }
    };

    const animationLoop = async () => {
        if (runningRef.current) {
            await predict();
            animationFrameRef.current = requestAnimationFrame(animationLoop);
        } else {
            console.log("Animation loop stopped - running is false");
        }
    };

    const handleDelete = () => {
        if (running) {
            handleStop();
        }
        onDelete(item.id);
    };

    const handleStart = async () => {
        if (modelLoaded && canvasContainerRef.current) {
            try {
                console.log("Starting webcam with camera:", selectedCameraId);

                setRunning(true);
                runningRef.current = true;

                // It isn't correct, but I'm making the webcam canvas square in order to get the full height of the video. I don't know why I have to do this. Width is clipped.
                const webcamInstance = new window.tmImage.Webcam(640, 640, flipCamera);
                webcamRef.current = webcamInstance;

                const constraints: MediaTrackConstraints | undefined = selectedCameraId
                    ? { deviceId: { exact: selectedCameraId } }
                    : undefined;

                console.log("Setting up webcam with constraints:", constraints);
                await webcamRef.current.setup(constraints);
                console.log("Webcam setup complete");

                canvasContainerRef.current.innerHTML = "";
                if (webcamRef.current.canvas) {
                    canvasContainerRef.current.appendChild(webcamRef.current.canvas);
                } else {
                    console.error("No canvas found on webcam instance");
                }

                await webcamRef.current.play();
                console.log("Webcam play started");

                // Wait a bit for video metadata to load, then log dimensions
                setTimeout(() => {
                    if (webcamRef.current?.webcam) {
                        const video = webcamRef.current.webcam;
                        console.log("Video element dimensions:", {
                            videoWidth: video.videoWidth,
                            videoHeight: video.videoHeight,
                            clientWidth: video.clientWidth,
                            clientHeight: video.clientHeight,
                            aspectRatio: video.videoWidth && video.videoHeight ? 
                                (video.videoWidth / video.videoHeight).toFixed(3) : "N/A"
                        });

                        // Get the underlying MediaStream dimensions
                        if (video.srcObject && video.srcObject instanceof MediaStream) {
                            const stream = video.srcObject as MediaStream;
                            const videoTracks = stream.getVideoTracks();
                            if (videoTracks.length > 0) {
                                const track = videoTracks[0];
                                const settings = track.getSettings();
                                console.log("MediaStream track settings:", {
                                    width: settings.width,
                                    height: settings.height,
                                    aspectRatio: settings.width && settings.height ? 
                                        (settings.width / settings.height).toFixed(3) : "N/A",
                                    frameRate: settings.frameRate,
                                    deviceId: settings.deviceId,
                                    facingMode: settings.facingMode
                                });

                                const constraints = track.getConstraints();
                                console.log("MediaStream track constraints:", constraints);

                                const capabilities = track.getCapabilities();
                                console.log("MediaStream track capabilities:", {
                                    width: capabilities.width,
                                    height: capabilities.height,
                                    aspectRatio: capabilities.aspectRatio,
                                    frameRate: capabilities.frameRate
                                });
                            }
                        }
                    }

                    if (webcamRef.current?.canvas) {
                        const canvas = webcamRef.current.canvas;
                        console.log("Canvas dimensions:", {
                            width: canvas.width,
                            height: canvas.height,
                            aspectRatio: canvas.width && canvas.height ? 
                                (canvas.width / canvas.height).toFixed(3) : "N/A"
                        });
                    }
                }, 500); // Wait 500ms for video metadata to load

                animationFrameRef.current = requestAnimationFrame(animationLoop);
            } catch (error) {
                console.error("Error starting webcam:", error);
                setRunning(false);
                runningRef.current = false;
                // Clean up on error
                if (canvasContainerRef.current) {
                    canvasContainerRef.current.innerHTML = "";
                }
            }
        } else {
            console.log(
                "Cannot start webcam - modelLoaded:",
                modelLoaded,
                "canvasContainerRef:",
                !!canvasContainerRef.current
            );
        }
    };
    const handleStop = () => {
        setRunning(false);
        runningRef.current = false;

        // Cancel the animation frame
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        try {
            webcamRef.current?.stop();
        } catch {}
        if (canvasContainerRef.current) {
            canvasContainerRef.current.innerHTML = "";
        }
        webcamRef.current = null;
    };

    return (
        <div className={css["list-item"]}>
            <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#666" }}>{modelType}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: "10px", color: "#666" }}>ID: {modelName}</span>
                <span style={{ flex: 1 }} />
                <button onClick={handleDelete} className={classList(css["btn"], css["gray"])}>
                    Delete
                </button>
            </div>
            <span style={{ paddingTop: "4px" }} />

            {/* Camera selection dropdown */}
            <div className={css["camera-selection"]}>
                <label htmlFor={`camera-select-${item.id}`} style={{ fontSize: "12px", marginRight: "8px" }}>
                    Camera:
                </label>
                <select
                    id={`camera-select-${item.id}`}
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    disabled={running}
                    style={{ fontSize: "12px", padding: "2px 4px" }}
                >
                    {availableCameras.map((camera, index) => (
                        <option key={camera.deviceId} value={camera.deviceId}>
                            {camera.label || `Camera ${index + 1}`}
                        </option>
                    ))}
                </select>
            </div>
            <span style={{ paddingTop: "4px" }} />

            {/* Camera flip checkbox */}
            <div className={css["camera-selection"]}>
                <label htmlFor={`flip-camera-${item.id}`} style={{ fontSize: "12px", marginRight: "8px" }}>
                    <input
                        type="checkbox"
                        id={`flip-camera-${item.id}`}
                        checked={flipCamera}
                        onChange={(e) => {
                            setFlipCamera(e.target.checked);
                            // Update the webcam flip setting if running
                            if (webcamRef.current) {
                                webcamRef.current.flip = e.target.checked;
                            }
                        }}
                        style={{ marginRight: "4px" }}
                    />
                    Flip camera horizontally
                </label>
            </div>
            <span style={{ paddingTop: "4px" }} />

            <div className={css["controls"]}>
                {!running ? (
                    <button onClick={handleStart} className={classList(css["btn"], css["green"])}>
                        Start
                    </button>
                ) : (
                    <button onClick={handleStop} className={classList(css["btn"], css["red"])}>
                        Stop
                    </button>
                )}
            </div>
            {modelLoaded && (
                <div className={css["model-labels"]}>
                    {labels.map((label) => (
                        <p key={label.title} style={{ fontSize: "12px", fontWeight: "bold" }}>
                            {label.title}: {label.confidence}
                        </p>
                    ))}
                </div>
            )}
            <div ref={canvasContainerRef} className={css["webcam-container"]} />
        </div>
    );
}

export function App() {
    const [items, setItems] = useState<ListItem[]>([]);
    const [nextId, setNextId] = useState(1);
    const [inputValue, setInputValue] = useState("");

    const addItem = (url: string) => {
        if (!url.trim()) return; // Don't add empty URLs

        const newItem: ListItem = {
            id: `item-${nextId}`,
            url: url,
        };
        setItems((prev) => [...prev, newItem]);
        setNextId((prev) => prev + 1);
        setInputValue(""); // Clear input after adding
    };

    const deleteItem = (id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const handleAddClick = () => {
        addItem(inputValue);
    };

    return (
        <div className={css["app"]}>
            <div className={css["header"]}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <h4 style={{ margin: 0 }}>Teachable Machine</h4>
                    <a 
                        href="https://teachablemachine.withgoogle.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                            color: "#666", 
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center"
                        }}
                        title="Visit Teachable Machine website"
                    >
                        <svg 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ opacity: 0.7 }}
                        >
                            <path 
                                d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            />
                        </svg>
                    </a>
                </div>
            </div>
            <div className={css["body"]}>
                <div className={css["controls"]}>
                    <div style={{ flex: 1 }}>
                        <input
                            type="text"
                            placeholder="Model URL"
                            className={css["model-url"]}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                    </div>
                    <div>
                        <button onClick={handleAddClick} className={classList(css["btn"], css["blue"])}>
                            Add
                        </button>
                    </div>
                </div>
                <span style={{ paddingTop: "4px" }} />
                <div className={css["item-list"]}>
                    {items.map((item) => (
                        <ModelItem key={item.id} item={item} onDelete={deleteItem} />
                    ))}
                </div>
            </div>
        </div>
    );
}
