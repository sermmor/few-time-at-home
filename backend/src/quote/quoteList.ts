export interface Quote {
  quote: string;
  author: string;
}

export class QuoteListUtilities {
  static getAInspirationalQuote = (quoteList: Quote[]): Quote | null => {
    if (quoteList.length === 0) return null;
    const randomIndex = Math.round(Math.random() * (quoteList.length - 1));
    return quoteList[randomIndex] ?? null;
  }

}