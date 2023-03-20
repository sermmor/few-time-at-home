export interface Quote {
  quote: string;
  author: string;
}

export class QuoteListUtilities {
  static getAInspirationalQuote = (quoteList: Quote[]): Quote => {
    const randomIndex = Math.round(Math.random() * quoteList.length); 
    return (randomIndex >= quoteList.length) ? quoteList[quoteList.length - 1] : quoteList[randomIndex];
  }

}