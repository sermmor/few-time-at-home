import { GenericTree } from './genericTree';
import { expectedNumberInnerNodes, expectedNumberLeafs, getMockTree } from './MockTree/mocksTree';

interface NodeInfo {
  label: string;
  node?: string;
}

describe('Testing GenericTree', () => {
  it('When using GenericTree.readTreeInWidth', () => {
    const tree = getMockTree();
    const expectedFilesOrder = `name file 1@name file 2@name file 3@text 1.txt@docu 1.mp4@docu 2.mp4@song nº 2.mp4@archive 1.txt@archive 2.txt@`;
    let numberLeafs = 0;
    let numberInnerNodes = 0;
    let filesOrder = '';

    tree.readTreeInWidth(child => {
      if (child.node) {
        numberLeafs++;
        filesOrder = `${filesOrder}${child.node}@`;
      } else {
        numberInnerNodes++;
      }
    });

    expect(numberLeafs).toBe(expectedNumberLeafs);
    expect(numberInnerNodes).toBe(expectedNumberInnerNodes);
    expect(filesOrder).toBe(expectedFilesOrder);
  });

  it('When using GenericTree.renameLabel in leaf node, rename leaf node', () => {
    const newName = 'my documents';
    const newNameClips = 'music clips';
    const tree = getMockTree();
    const nodeDocuments = tree.children[4];
    const nodeClips = tree.children[3].children[1];

    tree.renameLabelNode('hello');
    nodeDocuments.renameLabelNode(newName);
    nodeClips.renameLabelNode(newNameClips);

    expect(tree.label).toBe('/');
    expect(nodeDocuments.label).toBe(`/${newName}`);
    expect(nodeClips.label).toBe(`/video/${newNameClips}`);
  });
  it('When using GenericTree.addChildren', () => {
    const tree = getMockTree();
    const newNodeIntermediate: NodeInfo = { label: 'video/movies', };
    const newNodeLeaf: NodeInfo = { label: 'video/movies', node: 'movie 1.mp4', };
    const videoNode = tree.children[3];

    const moviesNode = videoNode.addChildren(newNodeIntermediate.label);
    const movie1Leaf = moviesNode.addChildren(newNodeLeaf.label, newNodeLeaf.node);

    expect(videoNode.children[videoNode.children.length - 1].label).toBe(newNodeIntermediate.label);
    expect(videoNode.children[videoNode.children.length - 1].children[0].node).toBe(movie1Leaf.node);
  });
  it('When using GenericTree.searchNodeLeafInChild', () => {
    const tree = getMockTree();
    const documentalNode = tree.children[3].children[0];
    const nameFile3 = 'name file 3';
    const docu2 = 'docu 2.mp4';
    const notExist = 'notExist';
    const equalsT = (node1: string, node2: string) => node1 === node2;

    const indexNodeNameFile3 = tree.searchNodeLeafInChild(nameFile3, equalsT);
    const indexDocu2 = documentalNode.searchNodeLeafInChild(docu2, equalsT);
    const indexNotExist = documentalNode.searchNodeLeafInChild(notExist, equalsT);

    expect(indexNodeNameFile3).toBeGreaterThan(-1);
    expect(indexDocu2).toBeGreaterThan(-1);
    expect(indexNotExist).toEqual(-1);
  });
  it('When using GenericTree.searchLabelInChild', () => {
    const tree = getMockTree();
    const documentsNode = tree.children[4];
    const video = '/video';
    const archive = '/documents/archive';
    const notExist = 'notExist';

    const indexVideo = tree.searchLabelInChild(video);
    const indexArchive = documentsNode.searchLabelInChild(archive);
    const indexNotExist = documentsNode.searchLabelInChild(notExist);

    expect(indexVideo).toBeGreaterThan(-1);
    expect(indexArchive).toBeGreaterThan(-1);
    expect(indexNotExist).toEqual(-1);
  });
  it('When using GenericTree.removeChild', () => {
    const tree = getMockTree();
    const inventedNode = new GenericTree<string>('/blablabla/blebleble', undefined);
    const documentsNode = tree.children[4];
    const documentalNode = tree.children[3].children[0];
    const equalsT = (node1: string, node2: string) => node1 === node2;

    tree.children[3].removeChild(documentalNode, equalsT);
    tree.removeChild(documentsNode, equalsT);
    tree.removeChild(inventedNode, equalsT);

    const indexInvented = tree.children.findIndex(child => child.label === '/blablabla/blebleble');
    const indexDocuments = tree.children.findIndex(child => child.label === '/documents');
    const indexDocumental = tree.children[3].children.findIndex(child => child.label === '/vide/documental');

    expect(indexInvented).toEqual(-1);
    expect(indexDocuments).toEqual(-1);
    expect(indexDocumental).toEqual(-1);
  });
  it('When using GenericTree.moveNode add from root', () => {
    const tree = getMockTree();

    tree.moveNode('/video', '/documents', undefined, (node1, node2) => node1 === node2);

    // console.log(GenericTree.toString(tree!, (current: string) => current));

    expect(tree.children[3].children[2].label).toBe('/documents/video');
  });
  it('When using GenericTree.moveNode add from folder not root', () => {
    const tree = getMockTree();

    tree.moveNode('/video/clips', '/documents', undefined, (node1, node2) => node1 === node2);

    // console.log(GenericTree.toString(tree!, (current: string) => current));

    expect(tree.children[4].children[2].label).toBe('/documents/clips');
  });
  it('When using GenericTree.moveNode add folder to root', () => {
    const tree = getMockTree();

    tree.moveNode('/video/clips', '/', undefined, (node1, node2) => node1 === node2);

    // console.log(GenericTree.toString(tree!, (current: string) => current));
    
    expect(tree.children[5].label).toBe('/clips');
  });
  it('When using GenericTree.moveNode moving a leaf', () => {
    const tree = getMockTree();

    tree.moveNode('/video/clips', '/documents', 'song nº 2.mp4', (node1, node2) => node1 === node2);

    // console.log(GenericTree.toString(tree!, (current: string) => current));

    expect(tree.children[4].children[2].node).toBe('song nº 2.mp4');
  });
});
