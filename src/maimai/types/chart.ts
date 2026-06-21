import type { KamaiGameVersions } from "./version";

export interface Chart {
    chartId: string;
    data: {
        inGameId: number | null;
        displayVersion: KamaiGameVersions;
    };
    difficulty: string;
    isPrimary: boolean;
    level: string;
    levelNum: number;
    playtype: string;
    songId: number;
    versions: string[];
}
