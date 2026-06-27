import type { ApiResponse } from "@common/response";
import { camelizeResponse, sanitizeKamaitachiErrorMessage } from "@common/util";
import { Difficulty, Type } from "gcm-database/maimai";
import type {
    Database,
    Existence,
    Chart as LocalChart,
} from "gcm-database-local/maimai";
import { BaseScoreAdapter, FailedToFetchError } from "maidraw";
import {
    AchievementTypes,
    ComboLamp,
    type Score as MaidrawScore,
    type MaimaiScoreAdapter,
    SyncLamp,
} from "maidraw/maimai";
import { MaimaiDXRate } from "rg-stats";
import { KamaiTachiBuilder } from "./builder";
import type { Chart } from "./types/chart";
import {
    type GameVersions,
    GameVersions as Versions,
} from "./types/gameVersions";
import type { Pb, Score } from "./types/score";
import type { Song } from "./types/song";
import { compareGameVersions, getGameVersion } from "./types/version";

type Region = "DX" | "EX" | "CN";

interface MaiScore extends MaidrawScore {
    optionalData: {
        kt?: {
            chartId: string;
        };
    } & MaidrawScore["optionalData"];
}

interface EnrichedPb {
    pb: Pb;
    chart: Chart;
    song: Song;
    localChart?: LocalChart;
    score: MaiScore;
}

export class KamaiTachiScoreAdapter
    extends BaseScoreAdapter
    implements MaimaiScoreAdapter
{
    private readonly database: Database;
    private currentVersion: GameVersions;
    private currentRegion: Region;
    constructor({
        database,
        baseUrl = "https://kamai.tachi.ac",
        version = Versions.PRISM_PLUS,
        region = "DX",
    }: {
        database: Database;
        baseUrl?: string;
        version?: GameVersions;
        region?: Region;
    }) {
        super({ baseUrl });
        this.database = database;
        this.currentVersion = version;
        this.currentRegion = region;
    }

    versions() {
        return new KamaiTachiBuilder(this.database);
    }

    async getPlayerPb(userId: string) {
        return camelizeResponse<{
            charts: Chart[];
            pbs: Pb[];
            songs: Song[];
        }>(
            await this.get<ApiResponse<unknown>>(
                `/api/v1/users/${userId}/games/maimaidx/pbs/all`,
                undefined,
                60 * 1000,
            ),
        );
    }
    public async getScoreHistory(userId: string, chartId: string) {
        return camelizeResponse<Score[]>(
            await this.get<ApiResponse<unknown>>(
                `/api/v1/users/${userId}/games/maimaidx/scores/${chartId}`,
                undefined,
                60 * 1000,
            ),
        );
    }
    private getDatabaseDifficulty(chart: Chart): Difficulty {
        const difficulty = chart.difficulty.toUpperCase();
        switch (true) {
            case difficulty.includes("RE:MASTER"):
                return Difficulty.RE_MASTER;
            case difficulty.includes("MASTER"):
                return Difficulty.MASTER;
            case difficulty.includes("EXPERT"):
                return Difficulty.EXPERT;
            case difficulty.includes("ADVANCED"):
                return Difficulty.ADVANCED;
            case difficulty.includes("UTAGE"):
                return Difficulty.UTAGE;
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
    private isCircleOrNewer(): boolean {
        return compareGameVersions(this.currentVersion, Versions.CIRCLE) >= 0;
    }
    private getInternalLevel(localChart?: LocalChart): number | undefined {
        if (!localChart) return undefined;
        const existences = localChart.optionalData.presences.filter(
            (v): v is Existence => v.type === "existence",
        );
        const levelFor = (versionName: string) =>
            existences.find((v) => v.version.name === versionName)?.data.level;
        const dxLevel = levelFor(this.currentVersion.DX);
        const exLevel = levelFor(this.currentVersion.EX);
        const cnLevel = levelFor(this.currentVersion.CN);
        switch (this.currentRegion) {
            case "DX":
                return dxLevel ?? exLevel ?? cnLevel;
            case "EX":
                return exLevel ?? dxLevel ?? cnLevel;
            case "CN":
                return cnLevel ?? dxLevel ?? exLevel;
        }
    }
    private getScoreDifficulty(chart: Chart): Difficulty {
        return this.getDatabaseDifficulty(chart);
    }
    private synthesizeChart(
        chart: Chart,
        song: Song,
        internalLevel: number | undefined,
    ): LocalChart {
        return {
            identifier: String(chart.data.inGameId ?? 0),
            title: song.title,
            artist: song.artist,
            difficulty: this.getScoreDifficulty(chart),
            type: chart.difficulty.toUpperCase().startsWith("DX")
                ? Type.DELUXE
                : Type.STANDARD,
            level: chart.level,
            internalLevel,
            notes: { tap: 0, hold: 0, slide: 0, touch: 0, break: 0 },
            bpm: [],
            designer: "",
            optionalData: {
                presences: [],
                version: { displayVersion: {} },
            },
        };
    }
    private buildScore(
        score: Pb | Score,
        chart: Chart,
        song: Song,
        localChart?: LocalChart,
    ): MaiScore {
        const internalLevel = this.getInternalLevel(localChart);
        const combo = (() => {
            switch (score.scoreData.lamp) {
                case "FULL COMBO":
                    return ComboLamp.FULL_COMBO;
                case "FULL COMBO+":
                    return ComboLamp.FULL_COMBO_PLUS;
                case "ALL PERFECT":
                    return ComboLamp.ALL_PERFECT;
                case "ALL PERFECT+":
                    return ComboLamp.ALL_PERFECT_PLUS;
                default:
                    return ComboLamp.NONE;
            }
        })();
        const dxRating =
            internalLevel !== undefined
                ? MaimaiDXRate.calculate(
                      score.scoreData.percent,
                      internalLevel,
                      this.isCircleOrNewer()
                          ? (score.scoreData.lamp as MaimaiDXRate.MaimaiDXLamps)
                          : undefined,
                  )
                : score.calculatedData.rate;
        const dxScore = (() => {
            if (
                score.scoreData.judgements.pcrit &&
                score.scoreData.judgements.perfect &&
                score.scoreData.judgements.great
            )
                return (
                    score.scoreData.judgements.pcrit * 3 +
                    score.scoreData.judgements.perfect * 2 +
                    score.scoreData.judgements.great
                );
            else return -1;
        })();
        return {
            chart: localChart
                ? { ...localChart, internalLevel }
                : this.synthesizeChart(chart, song, internalLevel),
            combo,
            sync: SyncLamp.NONE,
            achievement: score.scoreData.percent,
            achievementRank: this.getAchievementRank(score.scoreData.grade),
            dxRating,
            dxScore,
            optionalData: {
                kt: {
                    chartId: chart.chartId,
                },
            },
        };
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
            case "S+":
                return AchievementTypes.SP;
            case "SS":
                return AchievementTypes.SS;
            case "SS+":
                return AchievementTypes.SSP;
            case "SSS":
                return AchievementTypes.SSS;
            case "SSS+":
                return AchievementTypes.SSSP;
            default:
                return AchievementTypes.D;
        }
    }
    private async enrich(body: {
        charts: Chart[];
        pbs: Pb[];
        songs: Song[];
    }): Promise<EnrichedPb[]> {
        const pairs: { pb: Pb; chart: Chart; song: Song }[] = [];
        for (const pb of body.pbs) {
            const chart = body.charts.find((v) => v.chartId === pb.chartId);
            const song = body.songs.find((v) => v.id === pb.songId);
            if (chart && song) {
                pairs.push({ pb, chart, song });
            }
        }
        return Promise.all(
            pairs.map(async ({ pb, chart, song }) => {
                const localChart = await this.resolveLocalChart(chart);
                return {
                    pb,
                    chart,
                    song,
                    localChart,
                    score: this.buildScore(pb, chart, song, localChart),
                };
            }),
        );
    }
    private versionDiff(entry: EnrichedPb): number {
        const name =
            entry.localChart?.optionalData.version.displayVersion[
                this.currentRegion
            ]?.name ?? entry.chart.data.displayVersion;
        return compareGameVersions(this.currentVersion, getGameVersion(name));
    }
    private isOmnimixChart(chart: Chart): boolean {
        return !!(
            chart.versions[0]?.includes("-omni") &&
            chart.versions[1]?.includes("-omni")
        );
    }
    async getPlayerBest50(
        userId: string,
        {
            omnimix = true,
            use = "ALL",
        }: {
            omnimix?: boolean;
            use?: "AP" | "FC" | "ALL";
        } = {},
    ) {
        const rawPbs = await this.getPlayerPb(userId);
        if (!rawPbs?.success) {
            return {
                err: new FailedToFetchError(
                    "maidraw.maimai.adapter.kamaitachi",
                    "personal best scores",
                    sanitizeKamaitachiErrorMessage(
                        `${rawPbs?.description ?? "An unknown error has occured."}`,
                        userId,
                    ),
                    { userId },
                ),
            };
        }
        const entries = await this.enrich(rawPbs.body);
        const filterAp = (e: EnrichedPb) =>
            e.pb.scoreData.lamp === "ALL PERFECT" ||
            e.pb.scoreData.lamp === "ALL PERFECT+";
        const filterFc = (e: EnrichedPb) =>
            e.pb.scoreData.lamp === "FULL COMBO" ||
            e.pb.scoreData.lamp === "FULL COMBO+";
        const filterUse = (e: EnrichedPb) => {
            switch (use) {
                case "AP":
                    return filterFc(e);
                case "FC":
                    return filterAp(e) || filterFc(e);
                default:
                    return true;
            }
        };
        const newScores = entries.filter((e) => {
            const diff = this.versionDiff(e);
            return this.isCircleOrNewer() ? 0 <= diff && diff <= 1 : diff === 0;
        });
        const oldScores = entries.filter((e) => {
            const diff = this.versionDiff(e);
            if (this.isCircleOrNewer()) {
                return diff > 1 && (omnimix || !this.isOmnimixChart(e.chart));
            } else {
                return diff > 0 && (omnimix || !this.isOmnimixChart(e.chart));
            }
        });
        return {
            data: {
                new: this.sortByRating(newScores.filter(filterUse)).slice(
                    0,
                    15,
                ),
                old: this.sortByRating(oldScores.filter(filterUse)).slice(
                    0,
                    35,
                ),
            },
        };
    }
    private sortByRating(entries: EnrichedPb[]): MaiScore[] {
        return entries
            .map((e) => e.score)
            .sort(
                (a, b) =>
                    b.dxRating - a.dxRating || b.achievement - a.achievement,
            )
            .sort(
                (a, b) =>
                    b.dxRating - a.dxRating ||
                    (b.chart.internalLevel ?? 0) - (a.chart.internalLevel ?? 0),
            );
    }
    async getPlayerInfo(
        userId: string,
        options: {
            omnimix?: boolean;
            use?: "AP" | "FC" | "ALL";
        } = {
            omnimix: true,
            use: "ALL",
        },
    ) {
        const profile = await this.getPlayerProfileRaw(userId);
        if (!profile?.success) {
            return {
                err: new FailedToFetchError(
                    "maidraw.maimai.adapter.kamaitachi",
                    "player profile",
                    sanitizeKamaitachiErrorMessage(
                        `${profile?.description ?? "An unknown error has occured."}`,
                        userId,
                    ),
                    { userId },
                ),
            };
        }
        const { data: scores, err: serr } = await this.getPlayerBest50(
            userId,
            options,
        );
        if (serr) {
            return { err: serr };
        }
        const dxRating = [...scores.new, ...scores.old]
            .map((v) => v.dxRating)
            .reduce((sum, v) => sum + v, 0);

        return {
            data: {
                name: profile.body.username,
                rating: dxRating,
            },
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
                    "maidraw.maimai.adapter.kamaitachi",
                    "profile picture",
                    "An unknown error has occured.",
                ),
            };
        }
        return { data: pfp };
    }
    async getPlayerScore(username: string, chartIdentifier: string) {
        const rawPbs = await this.getPlayerPb(username);
        if (!rawPbs?.success) {
            return {
                err: new FailedToFetchError(
                    "maidraw.maimai.adapter.kamaitachi",
                    "personal best scores",
                    sanitizeKamaitachiErrorMessage(
                        `${rawPbs?.description ?? "An unknown error has occured."}`,
                        username,
                    ),
                    { username },
                ),
            };
        }
        const entries = (await this.enrich(rawPbs.body)).filter(
            (e) => String(e.chart.data.inGameId) === chartIdentifier,
        );
        const result = Object.values(Difficulty).reduce(
            (acc, difficulty) => {
                acc[difficulty] = null;
                return acc;
            },
            {} as Record<Difficulty, MaiScore | null>,
        );
        for (const entry of entries) {
            result[this.getScoreDifficulty(entry.chart)] = entry.score;
        }
        return { data: result };
    }
    public async getPlayerLevel50(
        username: string,
        level: number,
        page: number,
        options: { percise: boolean } = { percise: false },
    ) {
        if (page < 1) page = 1;
        const rawPbs = await this.getPlayerPb(username);
        if (!rawPbs?.success) {
            return {
                err: new FailedToFetchError(
                    "maidraw.maimai.adapter.kamaitachi",
                    "personal best scores",
                    sanitizeKamaitachiErrorMessage(
                        `${rawPbs?.description ?? "An unknown error has occured."}`,
                        username,
                    ),
                    { username },
                ),
            };
        }
        const entries = await this.enrich(rawPbs.body);
        return {
            data: entries
                .map((e) => e.score)
                .sort(
                    (a, b) =>
                        b.achievement - a.achievement ||
                        (b.chart.internalLevel ?? 0) -
                            (a.chart.internalLevel ?? 0),
                )
                .filter((v) => {
                    const chartLevel = v.chart.internalLevel ?? 0;
                    return options.percise
                        ? chartLevel === level
                        : this.levelBoundChecker(chartLevel, level, 6);
                })
                .slice((page - 1) * 50, (page - 1) * 50 + 50),
        };
    }
    private levelBoundChecker(payload: number, target: number, border: number) {
        let lb = 0,
            hb = 0;
        if ((target * 10) % 10 < border) {
            lb = Math.trunc(target);
            hb = Math.trunc(target) + (border - 1) * 0.1;
        } else {
            lb = Math.trunc(target) + border * 0.1;
            hb = Math.ceil(target) - 0.1;
        }
        return lb <= payload && payload <= hb;
    }
}
