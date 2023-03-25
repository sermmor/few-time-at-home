import { GenericTree } from './genericTree';
import { getMockTree } from './MockTree/mocksTree';


describe('Testing GenericTree (only statics methods)', () => {
  it('When using GenericTree.toString returns a string', () => {
    const tree = getMockTree();
    const stringTree = GenericTree.toString(tree, (current: string) => current);
    // console.log(stringTree)
    expect(stringTree.length).toBeGreaterThan(0);
  });
  it('When using GenericTree.placeNodeInTree', () => {
    
  });
  it('When using GenericTree.parseFromListWithPaths', () => {
    
  });
  it('When using GenericTree.parseTreeToList', () => {
    
  });
  it('When using GenericTree.searchNodeIntermediate', () => {
    
  });
  it('When using GenericTree.searchParent', () => {
    
  });
  it('When using GenericTree.changeLabel', () => {
    
  });
  it('When using GenericTree.putNode', () => {
    
  });
});
