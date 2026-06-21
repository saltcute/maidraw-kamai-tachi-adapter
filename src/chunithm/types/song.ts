export interface Song {
    altTitles: string[];
    artist: string;
    data: {
        // displayVersion: EGameVersions; // Removed 2026-05-20
        genre: string;
    };
    id: number;
    searchTerms: string[];
    title: string;
}
