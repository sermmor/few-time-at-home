import { quoteDataModelMock } from "../../data-model/mock/quoteMock";
import { QuoteDataModel } from "../../data-model/quote";
import { fetchJsonReceive } from "../fetch-utils";
import { quoteEndpoint } from "../urls-and-end-points";

const getRandomQuote = (): Promise<QuoteDataModel> => 
  fetchJsonReceive<QuoteDataModel>(quoteEndpoint(), quoteDataModelMock());

export const QuotesActions = { getRandomQuote };
