export enum CloudStateName { NORMAL, UPLOADING, DOWNLOADING, REMOVING };

export interface CloudState {
  name: CloudStateName;
  description: string;
}
export const createCloudState = () => ({
  name: CloudStateName.NORMAL,
  description: 'description',
});

export const isShowingDescriptionState = (cloudState: CloudState) => cloudState.name !== CloudStateName.NORMAL;
