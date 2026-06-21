import { GameVersions } from "./gameVersions";

export type KamaiGameVersions =
    (typeof GameVersions)[keyof typeof GameVersions]["kamai"];

export function getGameVersion(payload: string): GameVersions | null {
    for (const version of Object.values(GameVersions)) {
        if (
            version.kamai.toLowerCase() === payload.toLowerCase() ||
            version.DX.toLowerCase() === payload.toLowerCase() ||
            version.EX.toLowerCase() === payload.toLowerCase() ||
            version.CN.toLowerCase() === payload.toLowerCase()
        ) {
            return version;
        }
    }
    return null;
}

/**
 * Compare two game versions and calculate which is newer.
 *
 * @param a Game version.
 * @param b Game version.
 * @returns positive if a is newer, negative if b is newer, 0 if they are the same.
 */
export function compareGameVersions(
    a: GameVersions | null,
    b: GameVersions | null,
): number {
    if (!a && !b) return 0;
    if (!a) return -1; // b is newer
    if (!b) return 1; // a is newer
    return (
        Object.values(GameVersions).indexOf(b) -
        Object.values(GameVersions).indexOf(a)
    );
}
