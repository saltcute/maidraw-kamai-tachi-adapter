export interface Score {
    chartId: string;
    userId: number;
    calculatedData: {
        rating: number;
    };
    game: string;
    highlight: boolean;
    isPrimary: boolean;
    playtype: string;
    scoreData: {
        score: number;
        noteLamp: string;
        clearLamp: string;
        judgements: {
            jcrit: number;
            justice: number;
            attack: number;
            miss: number;
        };
        optional: {
            fast?: number;
            slow?: number;
            maxCombo?: number;
            enumIndexes: {
                lamp?: number;
                grade?: number;
            };
        };
        grade: string;
        enumIndexes: {
            noteLamp: number;
            clearLamp: number;
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
        clearLamp: string;
        judgements: {
            jcrit: number;
            justice: number;
            attack: number;
            miss: number;
        };
        optional: {
            fast?: number;
            slow?: number;
            maxCombo?: number;
            enumIndexes: {
                lamp?: number;
                grade?: number;
            };
        };
        grade: string;
        enumIndexes: {
            noteLamp: number;
            clearLamp: number;
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
