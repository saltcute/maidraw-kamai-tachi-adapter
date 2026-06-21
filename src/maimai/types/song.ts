export interface Song {
    altTitles: string[];
    artist: string;
    data: {
        displayVersion: string;
        genre: string;
    };
    id: number;
    searchTerms: string[];
    title: string;
}
