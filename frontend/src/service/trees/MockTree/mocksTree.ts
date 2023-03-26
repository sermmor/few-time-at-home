import { GenericTree } from "../genericTree";

export const expectedNumberLeafs = 9;
export const expectedNumberInnerNodes = 6;

export const getMockTree = () => {
  const tree = new GenericTree<string>('/', undefined);
  tree.addChildren('/', 'name file 1');
  tree.addChildren('/', 'name file 2');
  tree.addChildren('/', 'name file 3');
  const childVideo = tree.addChildren('/video');
  const childVideoDocu = childVideo.addChildren('/video/documental');
  childVideoDocu.addChildren('/video/documental', 'docu 1.mp4');
  childVideoDocu.addChildren('/video/documental', 'docu 2.mp4');
  const childVideoClips = childVideo.addChildren('/video/clips');
  childVideoClips.addChildren('/video/clips', 'song nº 2.mp4');
  const childDocuments = tree.addChildren('/documents');
  childDocuments.addChildren('/documents', 'text 1.txt');
  const childDocumentsArchive = childDocuments.addChildren('/documents/archive');
  childDocumentsArchive.addChildren('/documents/archive', 'archive 1.txt');
  childDocumentsArchive.addChildren('/documents/archive', 'archive 2.txt');
  return tree;
};

export const getMockFileList = (): {path: string, data: string}[] => ([
  { path: '/', data: 'name file 1' },
  { path: '/', data: 'name file 2' },
  { path: '/', data: 'name file 3' },
  { path: '/documents', data: 'text 1.txt' },
  { path: '/video/documental', data: 'docu 1.mp4' },
  { path: '/video/documental', data: 'docu 2.mp4' },
  { path: '/video/clips', data: 'song nº 2.mp4' },
  { path: '/documents/archive', data: 'archive 1.txt' },
  { path: '/documents/archive', data: 'archive 2.txt' },
]);
