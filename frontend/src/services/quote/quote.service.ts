interface QuoteItem {
  quote: string;
  author: string;
}

const quoteList: QuoteItem[] = [
  {
    quote: `Es muy duro olvidar el dolor, pero es más duro todavía recordar la dulzura. La felicidad no nos deja cicatrices. Apenas aprendemos nada de la paz.`,
    author: 'Chuck Palahniuk',
  },
  {
    quote: `Para justificar cualquier crimen, tienes que convertir a la víctima en tu enemigo. Al cabo de bastante tiempo, el mundo entero acaba siendo tu enemigo. Con cada crimen, estás más y más alineado del mundo. Te imaginas más y más que el mundo entero está en contra de ti.`,
    author: 'Chuck Palahniuk',
  },
  {
    quote: `Sé gentil. No dejes que el mundo te endurezca. No dejes que el dolor te haga odiar. No dejes que la amargura te robe la dulzura. Siéntete orgulloso de que aunque el resto del mundo esté en desacuerdo, todavía crees que es un lugar hermoso.`,
    author: 'Kurt Vonnegut',
  },
  {
    quote: `Cuidado con lo que pretendes ser, porque eres es lo que pretendes ser.`,
    author: 'Kurt Vonnegut',
  },
  {
     quote: `Un mequetrefe es alguien que se cree tan jodidamente listo, que no puede estarse con la boca callada. Digan lo que digan los demás, siempre tiene que discutir. Si usted dice que algo le gusta, le juro que dirá que está usted en un error por gustarle eso. Un mequetrefe hace lo que puede para que se sienta usted siempre como un idiota. Diga usted lo que diga, la razón siempre la tiene él.`,
    author: 'Kurt Vonnegut',
  },
];

export const getAInspirationalQuote = (): QuoteItem => {
  const randomIndex = Math.round(Math.random() * quoteList.length); 
  return (randomIndex >= quoteList.length) ? quoteList[quoteList.length - 1] : quoteList[randomIndex];
}
