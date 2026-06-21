import { Difficulty } from "gcm-database/ongeki";
import type {
    Database,
    Existence,
    Chart as LocalChart,
} from "gcm-database-local/ongeki";
import {
    BaseScoreAdapter,
    FailedToFetchError,
    IllegalArgumentError,
} from "maidraw";
import {
    AchievementTypes,
    BellLamp,
    ComboLamp,
    type Score as GekiScore,
    type OngekiScoreAdapter,
} from "maidraw/ongeki";
import { ONGEKIRating } from "rg-stats";
import type { ApiResponse } from "../common/response";
import {
    camelizeResponse,
    sanitizeKamaitachiErrorMessage,
    truncateNumber,
} from "../common/util";
import type { Chart } from "./types/chart";
import { PLATINUM_STAR_MAP } from "./types/platinumStarMap";
import type { Pb, Score } from "./types/score";
import type { Song } from "./types/song";
import { comparGameVersions, GameVersions } from "./types/version";

type ScoreType = "refresh" | "classic";

interface Enriched<S extends Pb | Score> {
    source: S;
    chart: Chart;
    song: Song;
    localChart?: LocalChart;
    score: GekiScore;
}

export class KamaiTachiScoreAdapter
    extends BaseScoreAdapter
    implements OngekiScoreAdapter
{
    private readonly database: Database;
    private readonly currentVersion: GameVersions;
    constructor({
        database,
        baseUrl = "https://kamai.tachi.ac/",
        currentVersion = GameVersions.REFRESH,
    }: {
        database: Database;
        baseUrl?: string;
        currentVersion?: GameVersions;
    }) {
        super({ baseUrl });
        this.database = database;
        this.currentVersion = currentVersion;
    }

    async getPlayerPb(userId: string) {
        return camelizeResponse<{
            charts: Chart[];
            pbs: Pb[];
            songs: Song[];
        }>(
            await this.get<ApiResponse<unknown>>(
                `/api/v1/users/${userId}/games/ongeki/pbs/all`,
                undefined,
                60 * 1000,
            ),
        );
    }
    async getPlayerRecentScores(userId: string) {
        return camelizeResponse<{
            charts: Chart[];
            scores: Score[];
            songs: Song[];
        }>(
            await this.get<ApiResponse<unknown>>(
                `/api/v1/users/${userId}/games/ongeki/scores/recent`,
                undefined,
                60 * 1000,
            ),
        );
    }
    getPlatinumScore(score: Score | Pb): number {
        const assumedPlatScoreRate = 0;
        if (score.scoreData.platinumScore) return score.scoreData.platinumScore;
        let platScore =
            (1 + assumedPlatScoreRate) * score.scoreData.judgements.cbreak;
        if (score.scoreData.optional.damage)
            platScore -= 2 * score.scoreData.optional.damage;
        if (
            score.scoreData.optional.totalBellCount &&
            score.scoreData.optional.bellCount
        )
            platScore -=
                2 *
                (score.scoreData.optional.totalBellCount -
                    score.scoreData.optional.bellCount);
        return platScore;
    }
    getPlatinumScoreRatio(chart: Chart, score: Score | Pb): number {
        return this.getPlatinumScore(score) / chart.data.maxPlatScore;
    }
    private getDatabaseDifficulty(chart: Chart): Difficulty {
        const difficulty = chart.difficulty.toUpperCase();
        switch (true) {
            case difficulty.includes("RE:MASTER"):
            case difficulty.includes("LUNATIC"):
                return Difficulty.LUNATIC;
            case difficulty.includes("MASTER"):
                return Difficulty.MASTER;
            case difficulty.includes("EXPERT"):
                return Difficulty.EXPERT;
            case difficulty.includes("ADVANCED"):
                return Difficulty.ADVANCED;
            default:
                return Difficulty.BASIC;
        }
    }
    private async resolveLocalChart(
        chart: Chart,
    ): Promise<LocalChart | undefined> {
        const id = chart.data.inGameId;
        if (id == null) return undefined;
        const res = await this.database.getChart(
            String(id),
            this.getDatabaseDifficulty(chart),
        );
        return res.data;
    }
    private getInternalLevel(chart: Chart, localChart?: LocalChart): number {
        return (
            localChart?.optionalData.presences
                .filter((v): v is Existence => v.type === "existence")
                .find((v) => v.version.name === this.currentVersion)?.data
                .level ?? chart.levelNum
        );
    }
    private getAchievementRank(grade: string): AchievementTypes {
        switch (grade) {
            case "C":
                return AchievementTypes.C;
            case "B":
                return AchievementTypes.B;
            case "BB":
                return AchievementTypes.BB;
            case "BBB":
                return AchievementTypes.BBB;
            case "A":
                return AchievementTypes.A;
            case "AA":
                return AchievementTypes.AA;
            case "AAA":
                return AchievementTypes.AAA;
            case "S":
                return AchievementTypes.S;
            case "SS":
                return AchievementTypes.SS;
            case "SSS":
                return AchievementTypes.SSS;
            case "SSS+":
                return AchievementTypes.SSSP;
            default:
                return AchievementTypes.D;
        }
    }
    private synthesizeChart(
        chart: Chart,
        song: Song,
        internalLevel: number,
    ): LocalChart {
        return {
            identifier: String(chart.data.inGameId ?? 0),
            title: song.title,
            artist: song.artist,
            difficulty: this.getDatabaseDifficulty(chart),
            level: chart.level,
            internalLevel,
            notes: { tap: 0, hold: 0, side: 0, flick: 0, bell: 0 },
            bpm: [],
            designer: "",
            lunatic: "none" as LocalChart["lunatic"],
            boss: {
                character: { rarity: "", name: "", card: "" },
                level: 0,
            },
            optionalData: {
                presences: [],
                version: { displayVersion: {} },
            },
        };
    }
    private buildScore(
        source: Pb | Score,
        chart: Chart,
        song: Song,
        localChart?: LocalChart,
        type: ScoreType = "refresh",
    ): GekiScore {
        const internalLevel = this.getInternalLevel(chart, localChart);
        const combo = (() => {
            switch (source.scoreData.noteLamp) {
                case "FULL COMBO":
                    return ComboLamp.FULL_COMBO;
                case "ALL BREAK":
                    return ComboLamp.ALL_BREAK;
                case "ALL BREAK+":
                    return ComboLamp.ALL_BREAK_PLUS;
                default:
                    return ComboLamp.NONE;
            }
        })();
        const bell =
            source.scoreData.bellLamp === "FULL BELL"
                ? BellLamp.FULL_BELL
                : BellLamp.NONE;
        const rating =
            type === "classic"
                ? ONGEKIRating.calculate(source.scoreData.score, internalLevel)
                : ONGEKIRating.calculateRefresh(
                      internalLevel,
                      source.scoreData.score,
                      source.scoreData.noteLamp as ONGEKIRating.OngekiNoteLamp,
                      bell === BellLamp.FULL_BELL,
                  );
        const starRating = source.scoreData.platinumStars
            ? ONGEKIRating.calculatePlatinum(
                  internalLevel,
                  PLATINUM_STAR_MAP[source.scoreData.platinumStars],
              )
            : 0;
        return {
            chart:
                localChart ?? this.synthesizeChart(chart, song, internalLevel),
            combo,
            bell,
            score: source.scoreData.score,
            platinumScore: this.getPlatinumScore(source),
            rank: this.getAchievementRank(source.scoreData.grade),
            rating,
            starRating,
            optionalData: {},
        };
    }
    private async enrich<S extends Pb | Score>(
        sources: S[],
        charts: Chart[],
        songs: Song[],
        type: ScoreType,
        { dropZeroLevel = false }: { dropZeroLevel?: boolean } = {},
    ): Promise<Enriched<S>[]> {
        const pairs: { source: S; chart: Chart; song: Song }[] = [];
        for (const source of sources) {
            const chart = charts.find((v) => v.chartId === source.chartId);
            const song = songs.find((v) => v.id === source.songId);
            if (chart && song) {
                if (dropZeroLevel && !(chart.levelNum > 0)) continue;
                pairs.push({ source, chart, song });
            }
        }
        return Promise.all(
            pairs.map(async ({ source, chart, song }) => {
                const localChart = await this.resolveLocalChart(chart);
                return {
                    source,
                    chart,
                    song,
                    localChart,
                    score: this.buildScore(
                        source,
                        chart,
                        song,
                        localChart,
                        type,
                    ),
                };
            }),
        );
    }
    private sortByRating(scores: GekiScore[]): GekiScore[] {
        return scores
            .slice()
            .sort((a, b) => b.rating - a.rating || b.score - a.score);
    }
    async getPlayerScore(username: string, chartIdentifier: string) {
        const rawPbs = await this.getPlayerPb(username);
        if (!rawPbs?.success) {
            return {
                err: new FailedToFetchError(
                    "maidraw.ongeki.adapter.kamaitachi",
                    "personal best scores",
                    sanitizeKamaitachiErrorMessage(
                        `${rawPbs?.description ?? "An unknown error has occured."}`,
                        username,
                    ),
                    { username },
                ),
            };
        }
        const entries = (
            await this.enrich(
                rawPbs.body.pbs,
                rawPbs.body.charts,
                rawPbs.body.songs,
                "refresh",
            )
        ).filter((e) => String(e.chart.data.inGameId) === chartIdentifier);
        const result = Object.values(Difficulty).reduce(
            (acc, difficulty) => {
                acc[difficulty] = null;
                return acc;
            },
            {} as Record<Difficulty, GekiScore | null>,
        );
        for (const entry of entries) {
            result[this.getDatabaseDifficulty(entry.chart)] = entry.score;
        }
        return { data: result };
    }
    async getPlayerBest60(
        userId: string,
        currentVersion = this.currentVersion,
    ) {
        const rawPbs = await this.getPlayerPb(userId);
        if (!rawPbs?.success) {
            return {
                err: new FailedToFetchError(
                    "maidraw.ongeki.adapter.kamaitachi",
                    "personal best scores",
                    sanitizeKamaitachiErrorMessage(
                        `${rawPbs?.description ?? "An unknown error has occured."}`,
                        userId,
                    ),
                    { userId },
                ),
            };
        }
        const entries = await this.enrich(
            rawPbs.body.pbs,
            rawPbs.body.charts,
            rawPbs.body.songs,
            "refresh",
            { dropZeroLevel: true },
        );
        const newScores = entries.filter(
            (e) => e.chart.data.displayVersion === currentVersion,
        );
        const oldScores = entries.filter(
            (e) =>
                comparGameVersions(
                    currentVersion,
                    e.chart.data.displayVersion,
                ) > 0,
        );
        const bestScores = entries.filter(
            (e) =>
                comparGameVersions(
                    currentVersion,
                    e.chart.data.displayVersion,
                ) >= 0,
        );
        return {
            data: {
                new: this.sortByRating(newScores.map((e) => e.score)).slice(
                    0,
                    10,
                ),
                old: this.sortByRating(oldScores.map((e) => e.score)).slice(
                    0,
                    50,
                ),
                plat: bestScores
                    .map((e) => e.score)
                    .sort(
                        (a, b) =>
                            b.starRating - a.starRating || b.score - a.score,
                    )
                    .filter((v) => v.starRating > 0)
                    .slice(0, 50),
                best: this.sortByRating(bestScores.map((e) => e.score)).slice(
                    0,
                    60,
                ),
            },
        };
    }
    async getPlayerBest55(
        userId: string,
        currentVersion = this.currentVersion,
    ) {
        const rawPbs = await this.getPlayerPb(userId);
        if (!rawPbs?.success) {
            return {
                err: new FailedToFetchError(
                    "maidraw.ongeki.adapter.kamaitachi",
                    "personal best scores",
                    sanitizeKamaitachiErrorMessage(
                        `${rawPbs?.description ?? "An unknown error has occured."}`,
                        userId,
                    ),
                    { userId },
                ),
            };
        }
        const rawRecents = await this.getPlayerRecentScores(userId);
        if (!rawRecents?.success) {
            return {
                err: new FailedToFetchError(
                    "maidraw.ongeki.adapter.kamaitachi",
                    "recent scores",
                    sanitizeKamaitachiErrorMessage(
                        `${rawRecents?.description ?? "An unknown error has occured."}`,
                        userId,
                    ),
                    { userId },
                ),
            };
        }
        const pbs = await this.enrich(
            rawPbs.body.pbs,
            rawPbs.body.charts,
            rawPbs.body.songs,
            "classic",
            { dropZeroLevel: true },
        );
        const recents = await this.enrich(
            rawRecents.body.scores,
            rawRecents.body.charts,
            rawRecents.body.songs,
            "classic",
        );
        const newScores = pbs.filter(
            (e) => e.chart.data.displayVersion === currentVersion,
        );
        const oldScores = pbs.filter(
            (e) =>
                comparGameVersions(
                    currentVersion,
                    e.chart.data.displayVersion,
                ) > 0,
        );
        const recentScores = recents.filter(
            (e) =>
                comparGameVersions(
                    currentVersion,
                    e.chart.data.displayVersion,
                ) >= 0,
        );
        return {
            data: {
                recent: this.ratingGuardSimulation(
                    recentScores
                        .reverse()
                        .map((e) => e.score)
                        .filter(
                            (v) => v.chart.difficulty !== Difficulty.LUNATIC,
                        ),
                ),
                new: this.sortByRating(newScores.map((e) => e.score)).slice(
                    0,
                    15,
                ),
                old: this.sortByRating(oldScores.map((e) => e.score)).slice(
                    0,
                    30,
                ),
                best: this.sortByRating(pbs.map((e) => e.score)).slice(0, 45),
            },
        };
    }
    private ratingGuardSimulation(scores: GekiScore[]): GekiScore[] {
        const r30: { score: GekiScore; order: number }[] = [];
        for (let i = 0; i < scores.length; i++) {
            r30.sort((a, b) => a.order - b.order);
            const score = scores[i];
            if (r30.length < 30) {
                r30.push({ score, order: i });
            } else {
                switch (score.rank) {
                    case AchievementTypes.SSS:
                    // biome-ignore lint/suspicious/noFallthroughSwitchClause: falls through
                    case AchievementTypes.SSSP:
                        while (r30.length > 30) {
                            r30.shift();
                        }
                        if (r30.length >= 30) {
                            const best10 = r30
                                .slice()
                                .sort(
                                    (a, b) =>
                                        b.score.rating - a.score.rating ||
                                        b.score.score - a.score.score,
                                )
                                .slice(0, 10);
                            for (let j = 0; j < r30.length; ++j) {
                                if (!best10.includes(r30[j])) {
                                    r30[j] = { score, order: i };
                                    break;
                                }
                            }
                            break;
                        }
                    default:
                        r30.push({ score, order: i });
                        while (r30.length > 30) {
                            r30.shift();
                        }
                }
            }
        }
        return r30
            .sort((a, b) =>
                a.score.rating === b.score.rating
                    ? b.score.score - a.score.score
                    : b.score.rating - a.score.rating,
            )
            .slice(0, 10)
            .map((v) => v.score);
    }
    async getPlayerInfo(userId: string, type: ScoreType) {
        const profile = await this.getPlayerProfileRaw(userId);
        if (!profile?.success) {
            return {
                err: new FailedToFetchError(
                    "maidraw.ongeki.adapter.kamaitachi",
                    "player profile",
                    sanitizeKamaitachiErrorMessage(
                        `${profile?.description ?? "An unknown error has occured."}`,
                        userId,
                    ),
                    { userId },
                ),
            };
        }
        if (type === "refresh") {
            const { data: scores, err: serr } =
                await this.getPlayerBest60(userId);
            if (serr || !scores) {
                return { err: serr };
            }
            const newRating = scores.new
                .map((v) => truncateNumber(v.rating / 5, 3))
                .reduce((sum, v) => sum + v, 0);
            const oldRating = scores.old
                .map((v) => v.rating)
                .reduce((sum, v) => sum + v, 0);
            const platRating = scores.plat
                .map((v) => v.starRating)
                .reduce((sum, v) => sum + v, 0);
            return {
                data: {
                    name: profile.body.username,
                    rating:
                        truncateNumber(newRating / 10, 3) +
                        truncateNumber(oldRating / 50, 3) +
                        truncateNumber(platRating / 50, 3),
                },
            };
        } else if (type === "classic") {
            const { data: scores, err: serr } =
                await this.getPlayerBest55(userId);
            if (serr || !scores) {
                return { err: serr };
            }
            const rating = [...scores.recent, ...scores.new, ...scores.old]
                .map((v) => v.rating)
                .reduce((prev, cur) => prev + cur, 0);
            return {
                data: {
                    name: profile.body.username,
                    rating: truncateNumber(rating / 55, 2),
                },
            };
        } else
            return {
                err: new IllegalArgumentError(
                    "maidraw.ongeki.adapter.kamaitachi",
                    `Type can only be "refresh" or "classic".`,
                ),
            };
    }
    private async getPlayerProfileRaw(userId: string) {
        return camelizeResponse<{
            username: string;
            id: number;
            about: string;
        }>(await this.get<ApiResponse<unknown>>(`/api/v1/users/${userId}`));
    }
    async getPlayerProfilePicture(userId: string) {
        const pfp = await this.get<Buffer>(
            `/api/v1/users/${userId}/pfp`,
            undefined,
            2 * 60 * 60 * 1000,
            { responseType: "arraybuffer" },
        );
        if (!pfp) {
            return {
                err: new FailedToFetchError(
                    "maidraw.ongeki.adapter.kamaitachi",
                    "profile picture",
                    "An unknown error has occured.",
                ),
            };
        }
        return { data: pfp };
    }
    private withVersion(currentVersion: GameVersions) {
        return new KamaiTachiScoreAdapter({
            database: this.database,
            currentVersion,
        });
    }
    public ongeki() {
        return this.withVersion(GameVersions.ONGEKI);
    }
    public plus() {
        return this.withVersion(GameVersions.ONGEKI_PLUS);
    }
    public summer() {
        return this.withVersion(GameVersions.SUMMER);
    }
    public summerPlus() {
        return this.withVersion(GameVersions.SUMMER_PLUS);
    }
    public red() {
        return this.withVersion(GameVersions.RED);
    }
    public redPlus() {
        return this.withVersion(GameVersions.RED_PLUS);
    }
    public bright() {
        return this.withVersion(GameVersions.BRIGHT);
    }
    public brightMemoryAct1() {
        return this.withVersion(GameVersions.BRIGHT_MEMORY_ACT_1);
    }
    public brightMemoryAct2() {
        return this.withVersion(GameVersions.BRIGHT_MEMORY_ACT_2);
    }
    public brightMemoryAct3() {
        return this.withVersion(GameVersions.BRIGHT_MEMORY_ACT_3);
    }
    public refresh() {
        return this.withVersion(GameVersions.REFRESH);
    }
}
