export interface RssDataModel {
    messages: string[];
}

/** Motivo por el que se recomienda un elemento (categoría Recomiéndame). */
export type RecommendationReason =
    | { kind: 'similar'; ref: string }
    | { kind: 'author'; ref: string }
    | { kind: 'domain'; ref: string }
    | { kind: 'recent' };

export interface RssRecommendedDataModel {
    messages: string[];
    /** Opcional: una por mensaje, en el mismo orden. */
    reasons?: RecommendationReason[];
}