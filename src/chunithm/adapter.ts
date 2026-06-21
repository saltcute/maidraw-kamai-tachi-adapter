import { Difficulty } from "gcm-database/chunithm";
import type {
    Database,
    Existence,
    Chart as LocalChart,
} from "gcm-database-local/chunithm";
import {
    BaseScoreAdapter,
    FailedToFetchError,
    IllegalArgumentError,
} from "maidraw";
import {
    AchievementTypes,
    ChainLamp,
    type ChunithmScoreAdapter,
    type Score as ChuScore,
    ClearLamp,
    ComboLamp,
} from "maidraw/chunithm";
import { CHUNITHMRating } from "rg-stats";
import type { ApiResponse } from "../common/response";
import {
    camelizeResponse,
    sanitizeKamaitachiErrorMessage,
} from "../common/util";
import { calculateParadiseLostRating } from "./lib/calculateParadiseLostRating";
import type { Chart } from "./types/chart";
import type { Pb, Score } from "./types/score";
import type { Song } from "./types/song";
import { comparGameVersions, GameVersions } from "./types/version";

interface Enriched<S extends Pb | Score> {
    source: S;
    chart: Chart;
    song: Song;
    localChart?: LocalChart;
    score: ChuScore;
}

export class KamaiTachiScoreAdapter
    extends BaseScoreAdapter
    implements ChunithmScoreAdapter
{
    private readonly database: Database;
    private readonly currentVersion: GameVersions;
    constructor({
        database,
        baseUrl = "https://kamai.tachi.ac",
        currentVersion = GameVersions.CHUNITHM_VERSE,
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
                `/api/v1/users/${userId}/games/chunithm/pbs/all`,
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
                `/api/v1/users/${userId}/games/chunithm/scores/recent`,
                undefined,
                60 * 1000,
            ),
        );
    }
    private chartId(chart: Chart): number {
        return [chart.data.inGameId].flat()[0];
    }
    private getDatabaseDifficulty(chart: Chart): Difficulty {
        const difficulty = chart.difficulty.toUpperCase();
        switch (true) {
            case difficulty.includes("ULTIMA"):
                return Difficulty.ULTIMA;
            case difficulty.includes("MASTER"):
                return Difficulty.MASTER;
            case difficulty.includes("EXPERT"):
                return Difficulty.EXPERT;
            case difficulty.includes("ADVANCED"):
                return Difficulty.ADVANCED;
            case difficulty.includes("WORLD"):
                return Difficulty.WORLDS_END;
            default:
                return Difficulty.BASIC;
        }
    }
    private async resolveLocalChart(
        chart: Chart,
    ): Promise<LocalChart | undefined> {
        const res = await this.database.getChart(
            String(this.chartId(chart)),
            this.getDatabaseDifficulty(chart),
        );
        return res.data;
    }
    private getKamaiVersion(version: string): GameVersions | null {
        switch (version) {
            case "CHUNITHM":
                return GameVersions.CHUNITHM;
            case "CHUNITHM PLUS":
                return GameVersions.CHUNITHM_PLUS;
            case "CHUNITHM AIR":
                return GameVersions.CHUNITHM_AIR;
            case "CHUNITHM AIR PLUS":
                return GameVersions.CHUNITHM_AIR_PLUS;
            case "CHUNITHM STAR":
                return GameVersions.CHUNITHM_STAR;
            case "CHUNITHM STAR PLUS":
                return GameVersions.CHUNITHM_STAR_PLUS;
            case "CHUNITHM AMAZON":
                return GameVersions.CHUNITHM_AMAZON;
            case "CHUNITHM AMAZON PLUS":
                return GameVersions.CHUNITHM_AMAZON_PLUS;
            case "CHUNITHM CRYSTAL":
                return GameVersions.CHUNITHM_CRYSTAL;
            case "CHUNITHM CRYSTAL PLUS":
                return GameVersions.CHUNITHM_CRYSTAL_PLUS;
            case "CHUNITHM PARADISE":
                return GameVersions.CHUNITHM_PARADISE;
            case "CHUNITHM PARADISE LOST":
                return GameVersions.CHUNITHM_PARADISE_LOST;
            case "CHUNITHM NEW!!":
                return GameVersions.CHUNITHM_NEW;
            case "CHUNITHM NEW PLUS!!":
                return GameVersions.CHUNITHM_NEW_PLUS;
            case "CHUNITHM SUN":
                return GameVersions.CHUNITHM_SUN;
            case "CHUNITHM SUN PLUS":
                return GameVersions.CHUNITHM_SUN_PLUS;
            case "CHUNITHM LUMINOUS":
                return GameVersions.CHUNITHM_LUMINOUS;
            case "CHUNITHM LUMINOUS PLUS":
                return GameVersions.CHUNITHM_LUMINOUS_PLUS;
            case "CHUNITHM VERSE":
                return GameVersions.CHUNITHM_VERSE;
            case "CHUNITHM X-VERSE":
                return GameVersions.CHUNITHM_XVERSE;
            default:
                return null;
        }
    }
    private getInternalLevel(chart: Chart, localChart?: LocalChart): number {
        const fromPresences = localChart?.optionalData.presences
            .filter((v): v is Existence => v.type === "existence")
            .map((v) => ({
                sort: comparGameVersions(
                    this.getKamaiVersion(v.version.name),
                    this.currentVersion,
                ),
                level: v.data.level,
            }))
            .filter((v) => v.sort <= 0)
            .sort((a, b) => b.sort - a.sort)[0]?.level;
        if (fromPresences !== undefined) return fromPresences;
        return this.legacyInternalLevel(chart);
    }
    private legacyInternalLevel(chart: Chart): number {
        switch (this.chartId(chart)) {
            case 351: // ぶぉん！ぶぉん！らいど・おん！
            case 154: // SAVIOR OF SONG
            case 350: // FEEL×ALIVE
            case 410: // MY LIBERATION
            case 652: // L.L.L.
            case 235: // ファッとして桃源郷
            case 454: // ガチャガチャきゅ～と・ふぃぎゅ@メイト
            case 215: // Falling Roses
            case 546: // Last Proof
            case 581: // Los! Los! Los!
            case 582: // Uncontrollable
            case 609: // あ・え・い・う・え・お・あお!!
            case 580: // 楔
            case 651: // Clattanoia
            case 728: // Don't say "lazy"
            case 356: // クローバー♣かくめーしょん
            case 420: // Now Loading!!!!
            case 620: // メニメニマニマニ
            case 78: // crossing field
            case 206: // Signs Of Love (“Never More” ver.)
            case 243: // シュガーソングとビターステップ
            case 124: // 夏影
            case 34: // 亡國覚醒カタルシス
            case 650: // Futuristic Player
            case 646: // 理燃-コトワリ-
            case 726: // Sparkling Daydream
            case 296: // かくしん的☆めたまるふぉ～ぜっ!
            case 509: // Vitalization
            case 495: // 不安定な神様
            case 611: // SEVENTH HAVEN
            case 591: // ガヴリールドロップキック
            case 624: // 灼熱スイッチ
            case 725: // キミとボクのミライ
            case 9: // 情熱大陸
            case 353: // Star☆Glitter
            case 537: // ハレ晴レユカイ
            case 640: // POP TEAM EPIC
                if (chart.levelNum >= 13.7) return chart.levelNum - 1;
                else if (chart.levelNum >= 13.5) return 12.6;
                else if (chart.levelNum >= 13.2) return 12.5;
                else if (chart.levelNum >= 13) return 12.4;
                else if (chart.levelNum >= 12.7) return 12.3;
                else if (chart.levelNum >= 12.5) return 12.2;
                else if (chart.levelNum >= 12.2) return 12.1;
                else return chart.levelNum;
        }
        return chart.levelNum;
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
    private synthesizeChart(
        chart: Chart,
        song: Song,
        internalLevel: number,
    ): LocalChart {
        return {
            identifier: String(this.chartId(chart)),
            title: song.title,
            artist: song.artist,
            difficulty: this.getDatabaseDifficulty(chart),
            level: chart.level,
            internalLevel,
            notes: { tap: 0, hold: 0, slide: 0, air: 0 },
            bpm: [],
            designer: "",
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
    ): ChuScore {
        const internalLevel = this.getInternalLevel(chart, localChart);
        const combo = (() => {
            switch (source.scoreData.noteLamp) {
                case "FULL COMBO":
                    return ComboLamp.FULL_COMBO;
                case "ALL JUSTICE":
                    return ComboLamp.ALL_JUSTICE;
                case "ALL JUSTICE CRITICAL":
                    return ComboLamp.ALL_JUSTICE_CRITICAL;
                default:
                    return ComboLamp.NONE;
            }
        })();
        const clear = (() => {
            switch (source.scoreData.clearLamp) {
                case "CLEAR":
                    return ClearLamp.CLEAR;
                case "HARD":
                    return ClearLamp.HARD;
                case "BRAVE":
                    return ClearLamp.BRAVE;
                case "ABSOLUTE":
                    return ClearLamp.ABSOLUTE;
                case "CATASTROPHY":
                    return ClearLamp.CATASTROPHY;
                case "FAILED":
                    return ClearLamp.FAILED;
                default:
                    return ClearLamp.NONE;
            }
        })();
        const rating =
            comparGameVersions(
                this.currentVersion,
                GameVersions.CHUNITHM_NEW,
            ) >= 0
                ? CHUNITHMRating.calculate(
                      source.scoreData.score,
                      internalLevel,
                  )
                : calculateParadiseLostRating(
                      internalLevel,
                      source.scoreData.score,
                  );
        return {
            chart:
                localChart ?? this.synthesizeChart(chart, song, internalLevel),
            combo,
            chain: ChainLamp.NONE,
            clear,
            score: source.scoreData.score,
            rank: this.getAchievementRank(source.scoreData.grade),
            rating,
            optionalData: {},
        };
    }
    private async enrich<S extends Pb | Score>(
        sources: S[],
        charts: Chart[],
        songs: Song[],
        { dropWorldsEnd = false }: { dropWorldsEnd?: boolean } = {},
    ): Promise<Enriched<S>[]> {
        const pairs: { source: S; chart: Chart; song: Song }[] = [];
        for (const source of sources) {
            const chart = charts.find((v) => v.chartId === source.chartId);
            const song = songs.find((v) => v.id === source.songId);
            if (chart && song) {
                if (dropWorldsEnd && this.chartId(chart) > 8000) continue;
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
                    score: this.buildScore(source, chart, song, localChart),
                };
            }),
        );
    }
    private addVersionOf(entry: Enriched<Pb | Score>): GameVersions {
        const name =
            entry.localChart?.optionalData.version.displayVersion.JPN?.name;
        return (
            (name ? this.getKamaiVersion(name) : null) ??
            (entry.chart.data.displayVersion as GameVersions)
        );
    }
    private isChartInVersionStrict(
        entry: Enriched<Pb | Score>,
        version: GameVersions,
    ): boolean {
        const existences = entry.localChart?.optionalData.presences.filter(
            (v): v is Existence => v.type === "existence",
        );
        if (!existences) return false;
        return !!existences.find((v) => {
            if (
                version === GameVersions.CHUNITHM_PARADISE ||
                version === GameVersions.CHUNITHM_PARADISE_LOST
            ) {
                const mapped = this.getKamaiVersion(v.version.name);
                return (
                    mapped === GameVersions.CHUNITHM_PARADISE ||
                    mapped === GameVersions.CHUNITHM_PARADISE_LOST
                );
            }
            return this.getKamaiVersion(v.version.name) === version;
        });
    }
    private sortByRating(scores: ChuScore[]): ChuScore[] {
        return scores
            .slice()
            .sort((a, b) => b.rating - a.rating || b.score - a.score);
    }
    async getPlayerScore(username: string, chartIdentifier: string) {
        const rawPbs = await this.getPlayerPb(username);
        if (!rawPbs?.success) {
            return {
                err: new FailedToFetchError(
                    "maidraw.chunithm.adapter.kamaitachi",
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
            )
        ).filter((e) => String(this.chartId(e.chart)) === chartIdentifier);
        const result = Object.values(Difficulty).reduce(
            (acc, difficulty) => {
                acc[difficulty] = null;
                return acc;
            },
            {} as Record<Difficulty, ChuScore | null>,
        );
        for (const entry of entries) {
            result[this.getDatabaseDifficulty(entry.chart)] = entry.score;
        }
        return { data: result };
    }
    async getPlayerBest50(userId: string) {
        const rawPbs = await this.getPlayerPb(userId);
        if (!rawPbs?.success) {
            return {
                err: new FailedToFetchError(
                    "maidraw.chunithm.adapter.kamaitachi",
                    "personal best scores",
                    sanitizeKamaitachiErrorMessage(
                        `${rawPbs?.description ?? "An unknown error has occured."}`,
                        userId,
                    ),
                    { username: userId },
                ),
            };
        }
        const entries = await this.enrich(
            rawPbs.body.pbs,
            rawPbs.body.charts,
            rawPbs.body.songs,
            { dropWorldsEnd: true },
        );
        const newScores = entries.filter(
            (e) => this.addVersionOf(e) === this.currentVersion,
        );
        const oldScores = entries.filter(
            (e) =>
                comparGameVersions(this.currentVersion, this.addVersionOf(e)) >
                0,
        );
        return {
            data: {
                new: this.sortByRating(newScores.map((e) => e.score)).slice(
                    0,
                    20,
                ),
                old: this.sortByRating(oldScores.map((e) => e.score)).slice(
                    0,
                    30,
                ),
                best: this.sortByRating(entries.map((e) => e.score)).slice(
                    0,
                    50,
                ),
            },
        };
    }
    async getPlayerRecent40(
        userId: string,
        currentVersion = this.currentVersion,
        omnimix = true,
    ) {
        const rawPbs = await this.getPlayerPb(userId);
        if (!rawPbs?.success) {
            return {
                err: new FailedToFetchError(
                    "maidraw.chunithm.adapter.kamaitachi",
                    "personal best scores",
                    sanitizeKamaitachiErrorMessage(
                        `${rawPbs?.description ?? "An unknown error has occured."}`,
                        userId,
                    ),
                    { username: userId },
                ),
            };
        }
        const rawRecents = await this.getPlayerRecentScores(userId);
        if (!rawRecents?.success) {
            return {
                err: new FailedToFetchError(
                    "maidraw.chunithm.adapter.kamaitachi",
                    "recent scores",
                    sanitizeKamaitachiErrorMessage(
                        `${rawRecents?.description ?? "An unknown error has occured."}`,
                        userId,
                    ),
                    { username: userId },
                ),
            };
        }
        const pbs = await this.enrich(
            rawPbs.body.pbs,
            rawPbs.body.charts,
            rawPbs.body.songs,
            { dropWorldsEnd: true },
        );
        const recents = await this.enrich(
            rawRecents.body.scores,
            rawRecents.body.charts,
            rawRecents.body.songs,
            { dropWorldsEnd: true },
        );
        const inVersion = (entry: Enriched<Pb | Score>) =>
            comparGameVersions(
                currentVersion,
                entry.chart.data.displayVersion as GameVersions,
            ) >= 0 &&
            (omnimix || this.isChartInVersionStrict(entry, currentVersion));
        const bestScores = pbs.filter(inVersion);
        const recentScores = recents.filter(inVersion);
        return {
            data: {
                recent: this.ratingGuardSimulation(
                    recentScores.reverse().map((e) => e.score),
                ),
                best: this.sortByRating(bestScores.map((e) => e.score)).slice(
                    0,
                    50,
                ),
            },
        };
    }
    private ratingGuardSimulation(scores: ChuScore[]): ChuScore[] {
        let r30: { score: ChuScore; order: number }[] = [];
        for (let i = 0; i < scores.length; i++) {
            r30 = r30.sort((a, b) => a.order - b.order);
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
                                .sort((a, b) =>
                                    a.score.rating === b.score.rating
                                        ? b.score.score - a.score.score
                                        : b.score.rating - a.score.rating,
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
    async getPlayerInfo(userId: string, type: "new" | "recents") {
        const profile = await this.getPlayerProfileRaw(userId);
        if (!profile?.success) {
            return {
                err: new FailedToFetchError(
                    "maidraw.chunithm.adapter.kamaitachi",
                    "player profile",
                    sanitizeKamaitachiErrorMessage(
                        `${profile?.description ?? "An unknown error has occured."}`,
                        userId,
                    ),
                    { username: userId },
                ),
            };
        }
        if (type === "new") {
            const { data: scores, err: serr } =
                await this.getPlayerBest50(userId);
            if (serr || !scores) {
                return { err: serr };
            }
            const rating = [
                ...scores.new.slice(0, 20),
                ...scores.old.slice(0, 30),
            ]
                .map((v) => v.rating)
                .reduce((prev, cur) => prev + cur, 0);
            return {
                data: {
                    name: profile.body.username,
                    rating: rating / 50,
                },
            };
        } else if (type === "recents") {
            const { data: scores, err: serr } =
                await this.getPlayerRecent40(userId);
            if (serr || !scores) {
                return { err: serr };
            }
            const rating = [
                ...scores.recent.slice(0, 10),
                ...scores.best.slice(0, 30),
            ]
                .map((v) => v.rating)
                .reduce((prev, cur) => prev + cur, 0);
            return {
                data: {
                    name: profile.body.username,
                    rating: rating / 40,
                },
            };
        } else
            return {
                err: new IllegalArgumentError(
                    "maidraw.chunithm.adapter.kamaitachi",
                    `Type can only be "recents" or "new".`,
                    { type },
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
                    "maidraw.chunithm.adapter.kamaitachi",
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
    public chunithm() {
        return this.withVersion(GameVersions.CHUNITHM);
    }
    public plus() {
        return this.withVersion(GameVersions.CHUNITHM_PLUS);
    }
    public air() {
        return this.withVersion(GameVersions.CHUNITHM_AIR);
    }
    public airPlus() {
        return this.withVersion(GameVersions.CHUNITHM_AIR_PLUS);
    }
    public star() {
        return this.withVersion(GameVersions.CHUNITHM_STAR);
    }
    public starPlus() {
        return this.withVersion(GameVersions.CHUNITHM_STAR_PLUS);
    }
    public amazon() {
        return this.withVersion(GameVersions.CHUNITHM_AMAZON);
    }
    public amazonPlus() {
        return this.withVersion(GameVersions.CHUNITHM_AMAZON_PLUS);
    }
    public crystal() {
        return this.withVersion(GameVersions.CHUNITHM_CRYSTAL);
    }
    public crystalPlus() {
        return this.withVersion(GameVersions.CHUNITHM_CRYSTAL_PLUS);
    }
    public superstar() {
        return this.withVersion(GameVersions.CHUNITHM_SUPERSTAR);
    }
    public paradise() {
        return this.withVersion(GameVersions.CHUNITHM_PARADISE);
    }
    public paradiseLost() {
        return this.withVersion(GameVersions.CHUNITHM_PARADISE_LOST);
    }
    public superstarPlus() {
        return this.withVersion(GameVersions.CHUNITHM_SUPERSTAR_PLUS);
    }
    public new() {
        return this.withVersion(GameVersions.CHUNITHM_NEW);
    }
    public newPlus() {
        return this.withVersion(GameVersions.CHUNITHM_NEW_PLUS);
    }
    public sun() {
        return this.withVersion(GameVersions.CHUNITHM_SUN);
    }
    public sunPlus() {
        return this.withVersion(GameVersions.CHUNITHM_SUN_PLUS);
    }
    public luminous() {
        return this.withVersion(GameVersions.CHUNITHM_LUMINOUS);
    }
    public luminousPlus() {
        return this.withVersion(GameVersions.CHUNITHM_LUMINOUS_PLUS);
    }
    public verse() {
        return this.withVersion(GameVersions.CHUNITHM_VERSE);
    }
    public xverse() {
        return this.withVersion(GameVersions.CHUNITHM_XVERSE);
    }
    public xversex() {
        return this.withVersion(GameVersions.CHUNITHM_XVERSEX);
    }
}
