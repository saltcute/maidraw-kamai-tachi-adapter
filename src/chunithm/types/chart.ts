import type { Song } from "./song";
import type { GameVersions } from "./version";

export interface Chart {
    chartId: string;
    legacyChartId: string;
    song: Song;
    data: {
        displayVersion: GameVersions; // Actual chart release version for ULTIMA/World's End
        inGameId: number | number[];
    };
    difficulty: string;
    isPrimary: boolean;
    level: string;
    levelNum: number;
    playtype: string;
    songId: number;
    versions: string[];
}
