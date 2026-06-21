export interface Song {
    altTitles: string[];
    artist: string;
    data: {
        genre: string;
    };
    id: number;
    searchTerms: string[];
    title: string;
}
