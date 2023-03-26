import { GenericTree } from './genericTree';
import { expectedNumberLeafs, getMockFileList, getMockTree } from './MockTree/mocksTree';


describe('Testing GenericTree (only statics methods)', () => {
  it('When using GenericTree.toString returns a string', () => {
    const tree = getMockTree();
    const stringTree = GenericTree.toString(tree, (current: string) => current);
    // console.log(stringTree)
    expect(stringTree.length).toBeGreaterThan(0);
  });
  it('When using GenericTree.parseTreeToList', () => {
    const tree = getMockTree();
    const expectedList = getMockFileList();
    
    const listTree = GenericTree.parseTreeToList(tree);
    let isEqualsToExpected = true;
    for (let i = 0; i < expectedNumberLeafs; i++) {
      isEqualsToExpected = listTree[i].data === expectedList[i].data && listTree[i].path === expectedList[i].path;
      if (!isEqualsToExpected) break;
    }

    expect(listTree.length).toBe(expectedNumberLeafs);
    expect(isEqualsToExpected).toBeTruthy();
  });
  it('When using GenericTree.searchNodeIntermediate', () => {
    const tree = getMockTree();
    const clipsPath = '/video/clips';
    const documentsPath = '/documents';
    const notExistPath = '/video/404';

    const nodeNotExist = GenericTree.searchNodeIntermediate(tree, notExistPath);
    const nodeRoot = GenericTree.searchNodeIntermediate(tree, '/');
    const nodeDocuments = GenericTree.searchNodeIntermediate(tree, documentsPath);
    const nodeClips = GenericTree.searchNodeIntermediate(tree, clipsPath);

    expect(nodeNotExist?.label).toBeUndefined();
    expect(nodeRoot?.label).toBe('/');
    expect(nodeDocuments?.label).toBe(documentsPath);
    expect(nodeClips?.label).toBe(clipsPath);
  });
  it('When using GenericTree.placeNodeInTree', () => {
    const tree = getMockTree();
    const dataArchive3 = { path: '/documents/archive', data: 'archive 3.txt' };
    const dataAwesomeWallpaper = { path: '/images/wallpapers', data: 'really awesome wallpaper.jpg' };
    const dataNameFile4 = { path: '/', data: 'name file 4.jpg' };

    const nodeArchive3 = GenericTree.placeNodeInTree(dataArchive3.data, dataArchive3.path, tree);
    const nodeAwesomeWallpaper = GenericTree.placeNodeInTree(dataAwesomeWallpaper.data, dataAwesomeWallpaper.path, tree);
    const nodeNameFile4 = GenericTree.placeNodeInTree(dataNameFile4.data, dataNameFile4.path, tree);

    expect(tree.children[6].node).toBe(nodeNameFile4.node);
    expect(tree.children[4].children[1].children[2].node).toBe(nodeArchive3.node);
    expect(tree.children[5].children[0].children[0].node).toBe(nodeAwesomeWallpaper.node);
  });
  it('When using GenericTree.parseFromListWithPaths', () => {
    const treeList = getMockFileList();

    const tree = GenericTree.parseFromListWithPaths(treeList);

    // console.log(GenericTree.toString(tree!, (current: string) => current));
    
    expect(tree?.label).toBe('/');
    expect(tree?.children.length).toBe(5);
    expect(tree?.children[3].children.length).toBe(2);
    expect(tree?.children[3].children[1].children.length).toBe(2);
    expect(tree?.children[4].children[0].children.length).toBe(2);
    expect(tree?.children[4].children[1].children.length).toBe(1);
  });
  it('When using GenericTree.searchParent', () => {
    const tree = getMockTree();
    const leafCase = new GenericTree<string>('/documents/archive', 'archive 2.txt');
    const internalNodeCase = new GenericTree<string>('/video/documental', undefined);

    const parentLeafNodeCase = GenericTree.searchParent(tree, leafCase);
    const parentInternalNodeCase = GenericTree.searchParent(tree, internalNodeCase);

    expect(parentLeafNodeCase?.label).toBe('/documents/archive');
    expect(parentInternalNodeCase?.label).toBe('/video');
  });
  it('When using GenericTree.changeLabel', () => {
    const tree = getMockTree();
    const newDocumentLabel = '/video';
    const oldDocumentLabel = '/documents';
    const documentsArchiveNode = tree.children[4].children[1];

    GenericTree.changeLabel(documentsArchiveNode, oldDocumentLabel, newDocumentLabel);

    expect(documentsArchiveNode.label).toBe('/video/archive');
    expect(documentsArchiveNode.children[0].label).toBe('/video/archive');
    expect(documentsArchiveNode.children[1].label).toBe('/video/archive');
  });
  it('When using GenericTree.putNode to put a node', () => {
    const tree = getMockTree();
    const newChild = new GenericTree<string>('/document/movie', undefined);
    newChild.addChildren('/document/movie', 'movie 1.mp4');
    newChild.addChildren('/document/movie', 'movie 2.mp4');
    newChild.addChildren('/document/movie', 'movie 3.mp4');
    const childFinalFinal = newChild.addChildren('/document/movie/final final');
    childFinalFinal.addChildren('/document/movie/final final', 'final movie.mp4');
    const nodeToPut = tree.children[3];
    const nodeToPutOldNumberChildren = nodeToPut.children.length;

    GenericTree.putNode(nodeToPut, newChild);

    // console.log(GenericTree.toString(tree!, (current: string) => current));
    
    expect(nodeToPut.children.length).toBe(nodeToPutOldNumberChildren + 1);
  });
  it('When using GenericTree.putNode to put a leaf', () => {
    const tree = getMockTree();
    const newChild = new GenericTree<string>('/document/movie', 'movie 1.mp4');
    const nodeToPut = tree.children[3].children[1];
    const nodeToPutOldNumberChildren = nodeToPut.children.length;

    GenericTree.putNode(nodeToPut, newChild);

    // console.log(GenericTree.toString(tree!, (current: string) => current));
    
    expect(nodeToPut.children.length).toBe(nodeToPutOldNumberChildren + 1);
  });
});
