export enum GameVersions {
    REFRESH = "オンゲキ Re:Fresh",
    BRIGHT_MEMORY_ACT_3 = "オンゲキ bright MEMORY Act.3",
    BRIGHT_MEMORY_ACT_2 = "オンゲキ bright MEMORY Act.2",
    BRIGHT_MEMORY_ACT_1 = "オンゲキ bright MEMORY Act.1",
    BRIGHT = "オンゲキ bright",
    RED_PLUS = "オンゲキ R.E.D. PLUS",
    RED = "オンゲキ R.E.D.",
    SUMMER_PLUS = "オンゲキ SUMMER PLUS",
    SUMMER = "オンゲキ SUMMER",
    ONGEKI_PLUS = "オンゲキ PLUS",
    ONGEKI = "オンゲキ",
}
/**
 * Compare two game versions and calculate which is newer.
 *
 * @param a Game version.
 * @param b Game version.
 * @returns positive if a is newer, negative if b is newer, 0 if they are the same.
 */
export function comparGameVersions(a: GameVersions, b: GameVersions): number {
    if (!Object.values(GameVersions).includes(a)) return -1;
    if (!Object.values(GameVersions).includes(b)) return 1;
    if (a === b) return 0;
    return (
        Object.values(GameVersions).indexOf(b) -
        Object.values(GameVersions).indexOf(a)
    );
}
