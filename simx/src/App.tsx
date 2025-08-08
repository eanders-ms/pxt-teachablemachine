import { useState } from "react";
import { classList } from "@/utils";
import css from "./App.module.scss";
import { ModelItem, ListItem } from "@/components";

export function App() {
    const [items, setItems] = useState<ListItem[]>([]);
    const [inputValue, setInputValue] = useState("");

    const addItem = async (url: string) => {
        if (!url.trim()) return;

        let resourceUrl: URL;
        try {
            resourceUrl = new URL(url);
        } catch {
            return;
        }
        let pathname = resourceUrl.pathname;
        if (pathname.endsWith("/")) {
            pathname = pathname.slice(0, -1);
        }
        pathname = pathname.split("/").pop()!;
        if (!pathname) {
            return;
        }

        // If this item already exists, do not add it again
        if (items.some((item) => item.id === pathname)) {
            console.warn("Item already exists:", pathname);
            return;
        }

        // Fetch model metadata
        let metadata: any;
        try {
            const response = await fetch(`${resourceUrl.toString()}metadata.json`);
            if (!response.ok) throw new Error("Failed to fetch metadata");
            metadata = await response.json();
            console.log("Fetched model metadata:", metadata);
        } catch (error) {
            console.error("Error fetching model metadata:", error);
        }

        if (!metadata) {
            return;
        }

        if (!!metadata["tfjsVersion"]) {
            const imageOrPoseMetadata = metadata as ImageOrPoseMetadata;

            let modelType = imageOrPoseMetadata["packageName"]?.split("/").pop();
            if (!modelType) {
                return;
            }

            if (modelType !== "image" && modelType !== "pose") {
                console.warn("Unsupported model type:", modelType);
                return;
            }

            const newItem: ListItem = {
                id: pathname,
                modelType,
                metadata: imageOrPoseMetadata,
                url,
            };
            setItems((prev) => [newItem, ...prev]);
        } else if (!!metadata["tfjsSpeechCommandsVersion"]) {
            const soundMetadata = metadata as SoundMetadata;

            const newItem: ListItem = {
                id: pathname,
                modelType: "sound",
                metadata: soundMetadata,
                url,
            };
            setItems((prev) => [newItem, ...prev]);
        }
        setInputValue("");
    };

    const deleteItem = (id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const handleAddClick = async () => {
        await addItem(inputValue);
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
                        className={classList(css["btn"], css["blue"])}
                        style={{
                            color: "white",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            fontSize: "12px",
                            fontWeight: "normal",
                            padding: "0 4px",
                        }}
                        title="Visit Teachable Machine website"
                    >
                        <span style={{ paddingRight: "2px" }}>Create</span>
                        <span style={{ minWidth: "max-content" }}>
                            <svg
                                width="12"
                                height="12"
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
                        </span>
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
