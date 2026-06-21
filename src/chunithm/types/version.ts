export enum GameVersions {
    CHUNITHM_XVERSEX = "CHUNITHM X-VERSE-X",
    CHUNITHM_XVERSE = "CHUNITHM X-VERSE",
    CHUNITHM_VERSE = "CHUNITHM VERSE",
    CHUNITHM_LUMINOUS_PLUS = "CHUNITHM LUMINOUS PLUS",
    CHUNITHM_LUMINOUS = "CHUNITHM LUMINOUS",
    CHUNITHM_SUN_PLUS = "CHUNITHM SUN PLUS",
    CHUNITHM_SUN = "CHUNITHM SUN",
    CHUNITHM_NEW_PLUS = "CHUNITHM NEW PLUS",
    CHUNITHM_NEW = "CHUNITHM NEW",
    CHUNITHM_SUPERSTAR_PLUS = "CHUNITHM SUPER STAR PLUS",
    CHUNITHM_PARADISE_LOST = "CHUNITHM PARADISE LOST",
    CHUNITHM_PARADISE = "CHUNITHM PARADISE",
    CHUNITHM_SUPERSTAR = "CHUNITHM SUPERSTAR",
    CHUNITHM_CRYSTAL_PLUS = "CHUNITHM CRYSTAL PLUS",
    CHUNITHM_CRYSTAL = "CHUNITHM CRYSTAL",
    CHUNITHM_AMAZON_PLUS = "CHUNITHM AMAZON PLUS",
    CHUNITHM_AMAZON = "CHUNITHM AMAZON",
    CHUNITHM_STAR_PLUS = "CHUNITHM STAR PLUS",
    CHUNITHM_STAR = "CHUNITHM STAR",
    CHUNITHM_AIR_PLUS = "CHUNITHM AIR PLUS",
    CHUNITHM_AIR = "CHUNITHM AIR",
    CHUNITHM_PLUS = "CHUNITHM PLUS",
    CHUNITHM = "CHUNITHM",
}
/**
 * Compare two game versions and calculate which is newer.
 *
 * @param a Game version.
 * @param b Game version.
 * @returns positive if a is newer, negative if b is newer, 0 if they are the same.
 */
export function comparGameVersions(
    a: GameVersions | null,
    b: GameVersions | null,
): number {
    if (!a && !b) return 0;
    if (!a || !Object.values(GameVersions).includes(a)) return -Infinity;
    if (!b || !Object.values(GameVersions).includes(b)) return Infinity;
    if (a === b) return 0;
    return (
        Object.values(GameVersions).indexOf(b) -
        Object.values(GameVersions).indexOf(a)
    );
}
