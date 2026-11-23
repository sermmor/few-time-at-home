import { RssDataModel, RssRecommendedDataModel } from "../rss";

export const rssDataModelMock = (): RssDataModel => ({
    messages: [
        'Título 1 blog\nAutor 1 - Fri Mar 15 2023\nContenido contenido contenido',
        '@autor2 - Fri Mar 16 2023\nContenido contenido contenido\nhttps://nitter.lacontrevoie.fr/autor2/123456789',
        '@autor 3 - Fri Mar 17 2023\nContenido contenido contenido\nhttps://instancia.mastodon/@autor3/987654321',
    ],
});

export const rssRecommendedDataModelMock = (): RssRecommendedDataModel => ({
    ...rssDataModelMock(),
    reasons: [{ kind: 'recent' }, { kind: 'author', ref: '@autor2' }, { kind: 'similar', ref: 'Título guardado' }],
});
