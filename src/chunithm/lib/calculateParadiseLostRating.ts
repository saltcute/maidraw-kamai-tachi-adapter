import { truncateNumber } from "@common/util";

/**
 * Calculate the CHUNITHM PARADISE / PARADISE LOST era rating of a score.
 *
 * rg-stats only models the CHUNITHM NEW (and newer) rating algorithm, so this
 * is ported from maidraw for the legacy rating curve.
 *
 * @param internalLevel Internal level of the chart.
 * @param score Score, range between 0 to 1010000.
 * @returns Raw decimal rating value.
 */
export function calculateParadiseLostRating(
    internalLevel: number,
    score: number,
): number {
    let bonus = 0;
    switch (true) {
        case score >= 1007500:
            bonus = 2;
            break;
        case score >= 1005000:
            bonus = 1.5 + truncateNumber((score - 1005000) / 50, 0) * 0.01;
            break;
        case score >= 1000000:
            bonus = 1 + truncateNumber((score - 1000000) / 100, 0) * 0.01;
            break;
        case score >= 975000:
            bonus = 0 + truncateNumber((score - 975000) / 250, 0) * 0.01;
            break;
        case score >= 900000:
            bonus = -0.0 - ((975000 - score) / 75000) * 5.0;
            break;
        case score >= 800000:
            bonus =
                -5.0 -
                ((900000 - score) / 100000) * ((internalLevel - 5.0) / 2);
            break;
        case score >= 500000:
            bonus =
                -5.0 -
                (internalLevel - 5.0) / 2 -
                ((800000 - score) / 300000) * ((internalLevel - 5.0) / 2);
            break;
        default:
            bonus = -internalLevel;
    }
    return internalLevel + bonus;
}
