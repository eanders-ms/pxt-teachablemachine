import { useState, useEffect, useRef } from "react";
import { classList } from "@/utils";
import css from "../App.module.scss";
import { ImageOrPoseItem } from "./types";
import { sendPredictions, Prediction } from "@/extension";

interface PoseModelProps {
    item: ImageOrPoseItem;
}

export function PoseModel({ item }: PoseModelProps) {
    const [labels, setLabels] = useState<Prediction[]>([]);
    const [running, setRunning] = useState(false);
    const [modelLoaded, setModelLoaded] = useState(false);
    const poseModelRef = useRef<tmPose.Model | null>(null);
    const webcamRef = useRef<tmPose.Webcam | null>(null);
    const canvasContainerRef = useRef<HTMLDivElement | null>(null);
    const poseCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const runningRef = useRef<boolean>(false);
    const labelsRef = useRef<Prediction[]>([]);
    const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string>("");
    const [flipCamera, setFlipCamera] = useState<boolean>(true);

    useEffect(() => {
        if (modelLoaded || !canvasContainerRef.current) return;
        console.log("Loading pose model from URL:", item.url);
        setModelLoaded(true);

        const loadModel = async () => {
            try {
                console.log("Fetching pose model files...");
                const model = await window.tmPose.load(item.url + "model.json", item.url + "metadata.json");
                console.log("Pose model loaded successfully:", model);
                return model;
            } catch (error) {
                console.error("Error loading pose model:", error);
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
                console.log("Pose model labels:", labelsArray);
                setLabels(labelsArray);
                labelsRef.current = labelsArray;
                poseModelRef.current = model;
            })
            .catch((error) => {
                console.error("Failed to load pose model:", error);
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
                console.log("PoseModel unmounting - cleaning up webcam");
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
                poseCanvasRef.current = null;
            }
        };
    }, []);

    const predict = async () => {
        if (webcamRef.current && poseModelRef.current && webcamRef.current.canvas && poseCanvasRef.current) {
            try {
                webcamRef.current.update();

                // Estimate pose from webcam
                const { pose, posenetOutput } = await poseModelRef.current.estimatePose(
                    webcamRef.current.canvas,
                    flipCamera
                );

                // Get pose classification predictions
                const prediction = await poseModelRef.current.predict(posenetOutput);

                // Update confidence labels
                setLabels((prevLabels) => {
                    const updatedLabels = prevLabels.map((label, index) => ({
                        ...label,
                        confidence: prediction[index] ? Number(prediction[index].probability.toFixed(3)) : 0,
                    }));
                    labelsRef.current = updatedLabels;
                    return updatedLabels;
                });

                // Draw pose keypoints and skeleton on overlay canvas
                const ctx = poseCanvasRef.current.getContext("2d");
                if (ctx && pose && pose.keypoints) {
                    // Clear the pose canvas
                    ctx.clearRect(0, 0, poseCanvasRef.current.width, poseCanvasRef.current.height);

                    // Calculate scale factor and positioning based on actual displayed size vs canvas size
                    const webcamCanvas = webcamRef.current.canvas;
                    const displayedRect = webcamCanvas.getBoundingClientRect();

                    // Calculate the actual video dimensions within the displayed canvas
                    // The video maintains aspect ratio and is centered due to object-fit: contain
                    const videoAspectRatio = webcamCanvas.width / webcamCanvas.height;
                    const displayAspectRatio = displayedRect.width / displayedRect.height;

                    let videoDisplayWidth, videoDisplayHeight, offsetX, offsetY;

                    if (displayAspectRatio > videoAspectRatio) {
                        // Display is wider than video - video will have margins on left/right
                        videoDisplayHeight = displayedRect.height;
                        videoDisplayWidth = videoDisplayHeight * videoAspectRatio;
                        offsetX = (displayedRect.width - videoDisplayWidth) / 2;
                        offsetY = 0;
                    } else {
                        // Display is taller than video - video will have margins on top/bottom
                        videoDisplayWidth = displayedRect.width;
                        videoDisplayHeight = videoDisplayWidth / videoAspectRatio;
                        offsetX = 0;
                        offsetY = (displayedRect.height - videoDisplayHeight) / 2;
                    }

                    const scaleX = videoDisplayWidth / webcamCanvas.width;
                    const scaleY = videoDisplayHeight / webcamCanvas.height;

                    // Update overlay canvas size to match displayed webcam size
                    const overlayCanvas = poseCanvasRef.current;
                    overlayCanvas.width = displayedRect.width;
                    overlayCanvas.height = displayedRect.height;
                    overlayCanvas.style.width = `${displayedRect.width}px`;
                    overlayCanvas.style.height = `${displayedRect.height}px`;

                    // Draw pose keypoints and skeleton with proper scaling
                    const minConfidence = 0.15;

                    // If camera is flipped, we need to mirror the keypoints horizontally
                    let adjustedKeypoints = pose.keypoints;
                    if (flipCamera) {
                        adjustedKeypoints = pose.keypoints.map((keypoint) => ({
                            ...keypoint,
                            position: {
                                x: webcamCanvas.width - keypoint.position.x,
                                y: keypoint.position.y,
                            },
                        }));
                    }

                    // Apply scaling and offset to keypoints for proper positioning
                    const finalKeypoints = adjustedKeypoints.map((keypoint) => ({
                        ...keypoint,
                        position: {
                            x: keypoint.position.x * scaleX + offsetX,
                            y: keypoint.position.y * scaleY + offsetY,
                        },
                    }));

                    // Draw skeleton and keypoints with positioned coordinates (scale = 1 since we already scaled)
                    window.tmPose.drawSkeleton(finalKeypoints, minConfidence, ctx, 4, "#00FFFF", 1);
                    window.tmPose.drawKeypoints(finalKeypoints, minConfidence, ctx, 6, "#FF0000", "#FFFFFF", 1);
                }
            } catch (error) {
                console.error("Error during pose prediction:", error);
            }
        }
    };

    const animationLoop = async () => {
        if (runningRef.current) {
            await predict();
            sendPredictions("pose", labelsRef.current);
            animationFrameRef.current = requestAnimationFrame(animationLoop);
        }
    };

    const handleStart = async () => {
        if (modelLoaded && canvasContainerRef.current) {
            try {
                console.log("Starting pose webcam with camera:", selectedCameraId);

                setRunning(true);
                runningRef.current = true;

                const webcamInstance = new window.tmPose.Webcam(400, 400, flipCamera);
                webcamRef.current = webcamInstance;

                const constraints: MediaTrackConstraints | undefined = selectedCameraId
                    ? { deviceId: { exact: selectedCameraId } }
                    : undefined;

                console.log("Setting up pose webcam with constraints:", constraints);
                await webcamRef.current.setup(constraints);
                console.log("Pose webcam setup complete");

                canvasContainerRef.current.innerHTML = "";

                // Add webcam canvas
                if (webcamRef.current.canvas) {
                    canvasContainerRef.current.appendChild(webcamRef.current.canvas);
                } else {
                    console.error("No canvas found on pose webcam instance");
                }

                // Create and add pose overlay canvas
                const poseCanvas = document.createElement("canvas");
                // Size will be set dynamically in predict() based on displayed webcam size
                poseCanvas.style.position = "absolute";
                poseCanvas.style.top = "0";
                poseCanvas.style.left = "0";
                poseCanvas.style.zIndex = "10";
                poseCanvas.style.pointerEvents = "none";
                poseCanvasRef.current = poseCanvas;
                canvasContainerRef.current.appendChild(poseCanvas);

                await webcamRef.current.play();
                console.log("Pose webcam play started");

                // Wait a bit for video metadata to load, then log dimensions
                setTimeout(() => {
                    if (webcamRef.current?.webcam) {
                        const video = webcamRef.current.webcam;
                        console.log("Pose video element dimensions:", {
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
                                console.log("Pose MediaStream track settings:", {
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
                            }
                        }
                    }

                    if (webcamRef.current?.canvas) {
                        const canvas = webcamRef.current.canvas;
                        console.log("Pose canvas dimensions:", {
                            width: canvas.width,
                            height: canvas.height,
                            aspectRatio:
                                canvas.width && canvas.height ? (canvas.width / canvas.height).toFixed(3) : "N/A",
                        });
                    }
                }, 500);

                animationFrameRef.current = requestAnimationFrame(animationLoop);
            } catch (error) {
                console.error("Error starting pose webcam:", error);
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
        poseCanvasRef.current = null;

        // Clear confidence labels
        setLabels((prevLabels) => {
            const clearedLabels = prevLabels.map((label) => ({
                ...label,
                confidence: 0,
            }));
            labelsRef.current = clearedLabels;
            return clearedLabels;
        });

        sendPredictions("pose", labelsRef.current);
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
            <div ref={canvasContainerRef} className={css["webcam-container"]} style={{ position: "relative" }} />
        </>
    );
}
