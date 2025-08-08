import { useState, useEffect, useRef } from "react";
import { classList } from "@/utils";
import css from "../App.module.scss";
import { ImageOrPoseItem } from "./types";
import { sendPredictions, Prediction } from "@/extension";

interface ImageModelProps {
    item: ImageOrPoseItem;
}

export function ImageModel({ item }: ImageModelProps) {
    const [labels, setLabels] = useState<Prediction[]>([]);
    const [running, setRunning] = useState(false);
    const [modelLoaded, setModelLoaded] = useState(false);
    const imageModelRef = useRef<tmImage.Model | null>(null);
    const webcamRef = useRef<tmImage.Webcam | null>(null);
    const canvasContainerRef = useRef<HTMLDivElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const runningRef = useRef<boolean>(false);
    const labelsRef = useRef<Prediction[]>([]);
    const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string>("");
    const [flipCamera, setFlipCamera] = useState<boolean>(false);

    useEffect(() => {
        if (modelLoaded || !canvasContainerRef.current) return;
        console.log("Loading model from URL:", item.url);
        setModelLoaded(true);

        const loadModel = async () => {
            try {
                console.log("Fetching model files...");
                const model = await window.tmImage.load(item.url + "model.json", item.url + "metadata.json");
                console.log("Model loaded successfully:", model);
                return model;
            } catch (error) {
                console.error("Error loading model:", error);
                throw error;
            }
        };

        loadModel()
            .then((model) => {
                const labelsArray: Prediction[] =
                    model._metadata["labels"]?.map((label: string) => ({
                        name: label,
                        confidence: 0,
                    })) || [];
                console.log("Model labels:", labelsArray);
                setLabels(labelsArray);
                labelsRef.current = labelsArray;
                imageModelRef.current = model;
            })
            .catch((error) => {
                console.error("Failed to load model:", error);
                setModelLoaded(false);
            });
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

    // Cleanup effect for component unmount
    useEffect(() => {
        return () => {
            // Cleanup when component unmounts
            if (runningRef.current) {
                console.log("ImageModel unmounting - cleaning up webcam");
                runningRef.current = false;

                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }

                try {
                    webcamRef.current?.stop();
                } catch (error) {
                    console.error("Error stopping webcam during cleanup:", error);
                }

                if (canvasContainerRef.current) {
                    canvasContainerRef.current.innerHTML = "";
                }

                webcamRef.current = null;
            }
        };
    }, []);

    const predict = async () => {
        if (webcamRef.current && imageModelRef.current && webcamRef.current.canvas) {
            try {
                webcamRef.current.update();
                const prediction = await imageModelRef.current.predict(webcamRef.current.canvas);

                setLabels((prevLabels) => {
                    const updatedLabels = prevLabels.map((label, index) => ({
                        ...label,
                        confidence: prediction[index] ? Number(prediction[index].probability.toFixed(3)) : 0,
                    }));
                    labelsRef.current = updatedLabels;
                    return updatedLabels;
                });
            } catch (error) {
                console.error("Error during prediction:", error);
            }
        }
    };

    const animationLoop = async () => {
        if (runningRef.current) {
            await predict();
            sendPredictions("image", labelsRef.current);
            animationFrameRef.current = requestAnimationFrame(animationLoop);
        }
    };

    const handleStart = async () => {
        if (modelLoaded && canvasContainerRef.current) {
            try {
                console.log("Starting webcam with camera:", selectedCameraId);

                setRunning(true);
                runningRef.current = true;

                const webcamInstance = new window.tmImage.Webcam(400, 400, flipCamera);
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
                            aspectRatio:
                                video.videoWidth && video.videoHeight
                                    ? (video.videoWidth / video.videoHeight).toFixed(3)
                                    : "N/A",
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
                                    aspectRatio:
                                        settings.width && settings.height
                                            ? (settings.width / settings.height).toFixed(3)
                                            : "N/A",
                                    frameRate: settings.frameRate,
                                    deviceId: settings.deviceId,
                                    facingMode: settings.facingMode,
                                });

                                const constraints = track.getConstraints();
                                console.log("MediaStream track constraints:", constraints);

                                const capabilities = track.getCapabilities();
                                console.log("MediaStream track capabilities:", {
                                    width: capabilities.width,
                                    height: capabilities.height,
                                    aspectRatio: capabilities.aspectRatio,
                                    frameRate: capabilities.frameRate,
                                });
                            }
                        }
                    }

                    if (webcamRef.current?.canvas) {
                        const canvas = webcamRef.current.canvas;
                        console.log("Canvas dimensions:", {
                            width: canvas.width,
                            height: canvas.height,
                            aspectRatio:
                                canvas.width && canvas.height ? (canvas.width / canvas.height).toFixed(3) : "N/A",
                        });
                    }
                }, 500);

                animationFrameRef.current = requestAnimationFrame(animationLoop);
            } catch (error) {
                console.error("Error starting webcam:", error);
                setRunning(false);
                runningRef.current = false;
                if (canvasContainerRef.current) {
                    canvasContainerRef.current.innerHTML = "";
                }
            }
        }
    };

    const handleStop = () => {
        setRunning(false);
        runningRef.current = false;

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

        // Clear confidence labels
        setLabels((prevLabels) => {
            const clearedLabels = prevLabels.map((label) => ({
                ...label,
                confidence: 0,
            }));
            labelsRef.current = clearedLabels;
            return clearedLabels;
        });

        sendPredictions("image", labelsRef.current);
    };

    return (
        <>
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
                        <p key={label.name} style={{ fontSize: "12px", fontWeight: "bold" }}>
                            {label.name}: {label.confidence}
                        </p>
                    ))}
                </div>
            )}
            <div ref={canvasContainerRef} className={css["webcam-container"]} />
        </>
    );
}
