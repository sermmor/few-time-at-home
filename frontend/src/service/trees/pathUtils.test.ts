import { PathUtils } from './pathUtils';

const mockPathRoot = '/';
const mockPath1 = '/documents/archive/2003';
const mockPath2 = '/video/clips';

describe('Testing PathUtils', () => {
  it('When using PathUtils.getSplitedPath returns a splited path', () => {
    const splitedPath = PathUtils.getSplitedPath(mockPath1);
    expect(splitedPath.length).toEqual(3);
  });
  it('When using PathUtils.getSplitedPath with a root returns a empty list', () => {
    const splitedPath = PathUtils.getSplitedPath(mockPathRoot);
    expect(splitedPath.length).toEqual(0);
  });
  it('When using PathUtils.removePrefixPath returns a path without prefix', () => {
    const newPath = PathUtils.removePrefixPath('/documents/archive', mockPath1);
    const newPathRoot = PathUtils.removePrefixPath(mockPath2, mockPath2);

    expect(newPath).toBe('/2003');
    expect(newPathRoot).toBe('/');
  });
  it('When using PathUtils.removePrefixPath with no existing prefix returns the path without changes', () => {
    const newPath = PathUtils.removePrefixPath('/documents/archive/1111', mockPath1);

    expect(newPath).toBe(mockPath1);
  });
  it('When using PathUtils.getParentPath returns a parent path', () => {
    const parent = PathUtils.getParentPath(mockPath1);
    const parentOfParent = PathUtils.getParentPath(parent);
    const parentOfParentOfParent = PathUtils.getParentPath(parentOfParent);
    
    expect(parent).toBe('/documents/archive');
    expect(parentOfParent).toBe('/documents');
    expect(parentOfParentOfParent).toBe('/');
  });
  it('When using PathUtils.getParentPath using root returns root', () => {
    const parent = PathUtils.getParentPath(mockPathRoot);
    expect(parent).toBe(mockPathRoot);
  });
  it('When using PathUtils.moveParentPath returns a moved path', () => {
    const newPath = PathUtils.moveParentPath(mockPath2, mockPath1);
    expect(newPath).toBe('/video/clips/2003');
  });
  it('When using PathUtils.moveParentPath trying move root to other path returns a moved path', () => {
    const newPath = PathUtils.moveParentPath(mockPath2, mockPathRoot);
    expect(newPath).toBe('/video/clips');
  });
  it('When using PathUtils.moveParentPath trying move something to root returns a moved path', () => {
    const newPath = PathUtils.moveParentPath(mockPathRoot, mockPath1);
    expect(newPath).toBe('/2003');
  });
});
