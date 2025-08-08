import { classList } from "@/utils";
import css from "../App.module.scss";
import { ImageModel } from "./ImageModel";
import { PoseModel } from "./PoseModel";
import { SoundModel } from "./SoundModel";
import { ListItem } from "./types";

interface ModelItemProps {
    item: ListItem;
    onDelete: (id: string) => void;
}

export function ModelItem({ item, onDelete }: ModelItemProps) {
    const handleDelete = () => {
        onDelete(item.id);
    };

    return (
        <div className={css["list-item"]}>
            <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#666", fontWeight: "bold", textTransform: "capitalize" }}>
                    {item.modelType}
                </span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: "10px", color: "#666" }}>ID: {item.id}</span>
                <span style={{ flex: 1 }} />
                <button onClick={handleDelete} className={classList(css["btn"], css["gray"])}>
                    Delete
                </button>
            </div>
            <span style={{ paddingTop: "4px" }} />

            {item.modelType === "image" && <ImageModel item={item} />}
            {item.modelType === "pose" && <PoseModel item={item} />}
            {item.modelType === "sound" && <SoundModel item={item} />}
        </div>
    );
}
