import type { PLATINUM_STAR_MAP } from "./platinumStarMap";

export interface Score {
    chartId: string;
    userId: number;
    comment: string | null;
    importType: string;
    calculatedData: {
        rating: number;
        scoreRating: number;
        starRating: number;
    };
    game: string;
    highlight: boolean;
    isPrimary: boolean;
    playtype: string;
    scoreData: {
        score: number;
        noteLamp: string;
        bellLamp: string;
        platinumScore: number;
        platinumStars: keyof typeof PLATINUM_STAR_MAP;
        judgements: {
            cbreak: number;
            break: number;
            hit: number;
            miss: number;
        };
        optional: Partial<{
            fast: number;
            slow: number;
            maxCombo: number;
            damage: number;
            bellCount: number;
            totalBellCount: number;
            scoreGraph: number[];
            platinumGraph: number[];
            bellGraph: number[];
            lifeGraph: number[];
            enumIndexes: {
                lamp?: number;
                grade?: number;
            };
        }>;
        grade: string;
        enumIndexes: {
            noteLamp: number;
            bellLamp: number;
            grade: number;
        };
    };
    songId: number;
    scoreId: string;
    scoreMeta: unknown;
    timeAdded: number;
    timeAchieved: number;
    service: string;
}
export interface Pb {
    chartId: string;
    userId: number;
    calculatedData: {
        rating: number;
        scoreRating: number;
        starRating: number;
    };
    game: string;
    highlight: boolean;
    isPrimary: boolean;
    playtype: string;
    rankingData: {
        rank: number;
        outOf: number;
        rivalRank: number | null;
    };
    scoreData: {
        score: number;
        noteLamp: string;
        bellLamp: string;
        platinumScore: number;
        platinumStars: keyof typeof PLATINUM_STAR_MAP;
        judgements: {
            cbreak: number;
            break: number;
            hit: number;
            miss: number;
        };
        optional: Partial<{
            fast: number;
            slow: number;
            maxCombo: number;
            damage: number;
            bellCount: number;
            totalBellCount: number;
            scoreGraph: number[];
            platinumGraph: number[];
            bellGraph: number[];
            lifeGraph: number[];
            enumIndexes: {
                lamp?: number;
                grade?: number;
            };
        }>;
        grade: string;
        enumIndexes: {
            noteLamp: number;
            bellLamp: number;
            grade: number;
        };
    };
    songId: number;
    timeAchieved: number;
    composedFrom: {
        name: string;
        scoreId: string;
    }[];
}
