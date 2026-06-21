import type { GameVersions } from "./version";

export interface Chart {
    chartId: string;
    data: {
        inGameId: number | null;
        displayVersion: GameVersions;
        chartViewUrl?: string;
        maxPlatScore: number;
        isBonusTrack: boolean;
    };
    difficulty: string;
    isPrimary: boolean;
    level: string;
    levelNum: number;
    playtype: string;
    songId: number;
    versions: string[];
}
