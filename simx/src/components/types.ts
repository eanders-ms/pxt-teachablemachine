export type ListItemBase = {
    id: string;
    modelType: string;
    url: string;
};

export type ImageOrPoseItem = {
    id: string;
    modelType: "image" | "pose";
    metadata: ImageOrPoseMetadata;
    url: string;
};

export type SoundItem = {
    id: string;
    modelType: "sound";
    metadata: SoundMetadata;
    url: string;
};

export type ListItem = ImageOrPoseItem | SoundItem;
