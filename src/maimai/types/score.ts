export interface Score {
    calculatedData: {
        rate: number;
    };
    chartId: string;
    comment: string | null;
    game: string;
    highlight: boolean;
    importType: string;
    isPrimary: boolean;
    playtype: string;
    scoreData: {
        percent: number;
        lamp: string;
        judgements: {
            pcrit?: number;
            perfect?: number;
            great?: number;
            good?: number;
            miss?: number;
        };
        optional: {
            fast: number;
            slow: number;
            maxCombo: number;
            enumIndexes: unknown;
        };
        grade: string;
        enumIndexes: {
            lamp: number;
            grade: number;
        };
    };
    scoreId: string;
    scoreMeta: unknown;
    service: string;
    songId: number;
    timeAchieved: number;
    timeAdded: number;
    userId: number;
}
export interface Pb {
    chartId: string;
    userId: number;
    calculatedData: {
        rate: number;
    };
    composedFrom: [
        {
            name: string;
            scoreId: string;
        },
        {
            name: string;
            scoreId: string;
        },
    ];
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
        percent: number;
        lamp: string;
        judgements: {
            pcrit?: number;
            perfect?: number;
            great?: number;
            good?: number;
            miss?: number;
        };
        optional: {
            fast: number;
            slow: number;
            maxCombo: number;
            enumIndexes: unknown;
        };
        grade: string;
        enumIndexes: {
            lamp: number;
            grade: number;
        };
    };
    songId: number;
    timeAchieved: number;
}
