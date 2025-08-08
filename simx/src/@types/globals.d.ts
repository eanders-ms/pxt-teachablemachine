// Type declarations for UMD builds of Teachable Machine (image, pose, sound)
// These are intended to be used when the scripts are loaded via <script> tags

declare global {
    // ---- SHARED TYPES ----
    interface ImageOrPoseMetadata {
        tfjsVersion: string;
        packageName: string;
        packageVersion: string;
        labels: string[];
        imageSize: number;
        weightUrl?: string;
        modelUrl?: string;
    }

    interface SoundMetadata {
        tfjsSpeechCommandsVersion: string;
        modelName: string;
        timeSteps: number;
        wordLabels: string[];
        vocab: string[];
        frameSize: number;
        sampleRate: number;
        keywords?: string[];
    }

    type ClassifierInputSource = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap;

    // ---- IMAGE MODEL ----
    namespace tmImage {
        interface Prediction {
            className: string;
            probability: number;
        }

        interface Model {
            predict(input: ClassifierInputSource, flipped?: boolean): Promise<Prediction[]>;

            predictTopK(
                input: ClassifierInputSource,
                maxPredictions?: number,
                flipped?: boolean
            ): Promise<Prediction[]>;

            getTotalClasses(): number;
            getClassLabels(): string[];
            getMetadata(): ImageOrPoseMetadata;
            dispose(): void;
            _metadata: ImageOrPoseMetadata;
        }

        interface ModelOptions {
            version?: number;
            checkpointUrl?: string;
            alpha?: number;
            trainingLayer?: string;
        }

        class Webcam {
            public flip: boolean;
            public width: number;
            public height: number;
            public webcam: HTMLVideoElement | null;
            public canvas: HTMLCanvasElement | null;

            constructor(width?: number, height?: number, flip?: boolean);

            setup(options?: MediaTrackConstraints): Promise<void>;
            play(): Promise<void>;
            pause(): void;
            stop(): void;
            update(): void;
            getWebcam(options?: MediaTrackConstraints): Promise<HTMLVideoElement>;
            stopStreamedVideo(videoEl: HTMLVideoElement): void;
            renderCameraToCanvas(): void;
        }

        function load(modelURL: string, metadataURL?: string): Promise<Model>;
        function loadFromFiles(model: File, weights: File, metadata: File): Promise<Model>;

        const IMAGE_SIZE: number;
        const version: string;
    }

    // ---- POSE MODEL ----
    namespace tmPose {
        interface Prediction {
            className: string;
            probability: number;
        }

        interface Keypoint {
            part: string;
            position: { x: number; y: number };
            score: number;
        }

        interface Pose {
            keypoints: Keypoint[];
            score?: number;
        }

        interface PoseOutput {
            pose: Pose;
            posenetOutput: Float32Array;
        }

        interface Model {
            estimatePose(
                input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
                flipHorizontal?: boolean
            ): Promise<PoseOutput>;

            predict(posenetOutput: Float32Array): Promise<Prediction[]>;

            predictTopK(posenetOutput: Float32Array, maxPredictions?: number): Promise<Prediction[]>;

            getTotalClasses(): number;
            getClassLabels(): string[];
            getMetadata(): ImageOrPoseMetadata;
            dispose(): void;
            _metadata: ImageOrPoseMetadata;
        }

        class Webcam {
            public flip: boolean;
            public width: number;
            public height: number;
            public webcam: HTMLVideoElement;
            public canvas: HTMLCanvasElement;

            constructor(width?: number, height?: number, flip?: boolean);

            setup(options?: MediaTrackConstraints): Promise<void>;
            play(): Promise<void>;
            pause(): void;
            stop(): void;
            update(): void;
            getWebcam(options?: MediaTrackConstraints): Promise<HTMLVideoElement>;
            stopStreamedVideo(videoEl: HTMLVideoElement): void;
            renderCameraToCanvas(): void;
        }

        function load(modelURL: string, metadataURL?: string): Promise<Model>;
        function loadFromFiles(model: File, weights: File, metadata: File): Promise<Model>;

        // Drawing utility functions
        function drawKeypoints(
            keypoints: Keypoint[],
            minConfidence: number,
            ctx: CanvasRenderingContext2D,
            keypointSize?: number,
            fillColor?: string,
            strokeColor?: string,
            scale?: number
        ): void;

        function drawSkeleton(
            keypoints: Keypoint[],
            minConfidence: number,
            ctx: CanvasRenderingContext2D,
            lineWidth?: number,
            strokeColor?: string,
            scale?: number
        ): void;

        function drawPoint(ctx: CanvasRenderingContext2D, y: number, x: number, r: number, color: string): void;

        function drawSegment(
            [ay, ax]: [number, number],
            [by, bx]: [number, number],
            color: string,
            scale: number,
            ctx: CanvasRenderingContext2D
        ): void;

        const version: string;
    }

    // ---- SOUND MODEL ----
    namespace tmSound {
        interface Prediction {
            className: string;
            probability: number;
        }

        interface ListenConfig {
            overlapFactor?: number; // 0 to 1, probably between 0.5 and 0.75
            probabilityThreshold?: number; // 0 to 1, threshold for prediction confidence
            includeSpectrogram?: boolean; // whether to include spectrogram in results
            invokeCallbackOnNoiseAndUnknown?: boolean; // whether to invoke callback for noise/unknown
        }

        interface ListenResult {
            scores: Float32Array; // probability scores for each class
            spectrogram?: ImageData; // optional spectrogram data
        }

        interface Model {
            modelURL: string;
            metadataURL: string;
            wordLabels(): string[]; // get class labels (same as getClassLabels)
            isListening: boolean;

            listen(callback: (result: ListenResult) => void, config?: ListenConfig): Promise<void>;

            stopListening(): void;

            // Standard methods for consistency with other TM models
            getClassLabels(): string[];
            getTotalClasses(): number;
            getMetadata(): ImageOrPoseMetadata;
            dispose(): void;
            ensureModelLoaded(): Promise<void>;
            _metadata: ImageOrPoseMetadata;
        }

        // Speech Commands factory function (matches TensorFlow.js Speech Commands API)
        function create(
            fftType: "BROWSER_FFT" | "SOFT_FFT",
            vocabulary?: string,
            modelURL?: string,
            metadataURL?: string
        ): Promise<Model>;

        function load(modelURL: string, metadataURL?: string): Promise<Model>;
        function loadFromFiles(model: File, weights: File, metadata: File): Promise<Model>;

        const version: string;
    }

    // ---- EXTEND WINDOW ----
    interface Window {
        tmImage: typeof tmImage;
        tmPose: typeof tmPose;
        tmSound: typeof tmSound;
    }
}

export {};
