import { GenericTree } from './genericTree';
import { getMockTree } from './MockTree/mocksTree';


describe('Testing GenericTree', () => {
  it('When using GenericTree.readTreeInWidth', () => {
    const tree = getMockTree();
    const expectedNumberLeafs = 9;
    const expectedNumberInnerNodes = 6;
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
    
  });
  it('When using GenericTree.removeChild', () => {
    
  });
  it('When using GenericTree.searchNodeLeafInChild', () => {
    
  });
  it('When using GenericTree.searchLabelInChild', () => {
    
  });
  it('When using GenericTree.moveNode', () => {
    
  });
});
