import { fetchBackgroundImage } from "../fetch-utils";
import { backgroundImageEndpoint } from "../urls-and-end-points";

export const BackgroundActions = {
  getBackgroundImage: (): Promise<string | null> => 
    fetchBackgroundImage(backgroundImageEndpoint()),
};
