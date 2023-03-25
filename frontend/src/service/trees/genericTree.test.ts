import { GenericTree } from './genericTree';

const createTree = () => {
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

const createFileList = (): {path: string, file: string}[] => ([
  { path: '/', file: 'name file 1' },
  { path: '/', file: 'name file 2' },
  { path: '/', file: 'name file 3' },
  { path: '/video/documental', file: 'docu 1.mp4' },
  { path: '/video/documental', file: 'docu 2.mp4' },
  { path: '/video/clips', file: 'song nº 2.mp4' },
  { path: '/documents', file: 'text 1.txt' },
  { path: '/documents/archive', file: 'archive 1.txt' },
  { path: '/documents/archive', file: 'archive 2.txt' },
]);

describe('Testing PathUtils', () => {
  it('When using PathUtils.getSplitedPath returns a splited path', () => {
    
  });
  it('When using PathUtils.removePrefixPath returns a path without prefix', () => {
    
  });
  it('When using PathUtils.getParentPath returns a parent path', () => {
    
  });
  it('When using PathUtils.moveParentPath returns a moved path', () => {
    
  });
});

describe('Testing GenericTree', () => {
  it('When using GenericTree.toString returns a string', () => {
    const tree = createTree();
    const stringTree = GenericTree.toString(tree, (current: string) => current);
    // console.log(stringTree);
    expect(stringTree.length).toBeGreaterThan(0);
  });
});
