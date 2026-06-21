import type { Database } from "gcm-database-local/maimai";
import { KamaiTachiScoreAdapter } from "./adapter";
import { GameVersions } from "./types/gameVersions";

type Region = "DX" | "EX";

export class KamaiTachiBuilder {
    private readonly database: Database;
    constructor(database: Database) {
        this.database = database;
    }
    private build(
        version: (typeof GameVersions)[keyof typeof GameVersions],
        region?: "DX" | "EX" | "CN",
    ) {
        return new KamaiTachiScoreAdapter({
            database: this.database,
            version,
            region,
        });
    }
    public maimai(region?: Region) {
        return this.build(GameVersions.MAIMAI, region);
    }
    public maimaiPlus(region?: Region) {
        return this.build(GameVersions.MAIMAI_PLUS, region);
    }
    public green(region?: Region) {
        return this.build(GameVersions.GREEN, region);
    }
    public greenPlus(region?: Region) {
        return this.build(GameVersions.GREEN_PLUS, region);
    }
    public orange(region?: Region) {
        return this.build(GameVersions.ORANGE, region);
    }
    public orangePlus(region?: Region) {
        return this.build(GameVersions.ORANGE_PLUS, region);
    }
    public pink(region?: Region) {
        return this.build(GameVersions.PINK, region);
    }
    public pinkPlus(region?: Region) {
        return this.build(GameVersions.PINK_PLUS, region);
    }
    public murasaki(region?: Region) {
        return this.build(GameVersions.MURASAKI, region);
    }
    public murasakiPlus(region?: Region) {
        return this.build(GameVersions.MURASAKI_PLUS, region);
    }
    public milk(region?: Region) {
        return this.build(GameVersions.MILK, region);
    }
    public milkPlus(region?: Region) {
        return this.build(GameVersions.MILK_PLUS, region);
    }
    public finale(region?: Region) {
        return this.build(GameVersions.FINALE, region);
    }
    public dx(region?: Region) {
        return this.build(GameVersions.DX, region);
    }
    public dxPlus(region?: Region) {
        return this.build(GameVersions.DX_PLUS, region);
    }
    public splash(region?: Region) {
        return this.build(GameVersions.SPLASH, region);
    }
    public splashPlus(region?: Region) {
        return this.build(GameVersions.SPLASH_PLUS, region);
    }
    public universe(region?: Region) {
        return this.build(GameVersions.UNIVERSE, region);
    }
    public universePlus(region?: Region) {
        return this.build(GameVersions.UNIVERSE_PLUS, region);
    }
    public festival(region?: Region) {
        return this.build(GameVersions.FESTIVAL, region);
    }
    public festivalPlus(region?: Region) {
        return this.build(GameVersions.FESTIVAL_PLUS, region);
    }
    public buddies(region?: Region) {
        return this.build(GameVersions.BUDDIES, region);
    }
    public buddiesPlus(region?: Region) {
        return this.build(GameVersions.BUDDIES_PLUS, region);
    }
    public prism(region?: Region) {
        return this.build(GameVersions.PRISM, region);
    }
    public prismPlus(region?: Region) {
        return this.build(GameVersions.PRISM_PLUS, region);
    }
    public circle(region?: Region) {
        return this.build(GameVersions.CIRCLE, region);
    }
    public circlePlus(region?: Region) {
        return this.build(GameVersions.CIRCLE_PLUS, region);
    }
    public chinese() {
        const build = this.build.bind(this);
        return {
            dx() {
                return build(GameVersions.DX, "CN");
            },
            dx2021() {
                return build(GameVersions.SPLASH, "CN");
            },
            dx2022() {
                return build(GameVersions.UNIVERSE, "CN");
            },
            dx2023() {
                return build(GameVersions.FESTIVAL, "CN");
            },
            dx2024() {
                return build(GameVersions.BUDDIES, "CN");
            },
            dx2025() {
                return build(GameVersions.PRISM, "CN");
            },
            dx2026() {
                return build(GameVersions.PRISM_PLUS, "CN");
            },
        };
    }
}
