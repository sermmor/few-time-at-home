export class PathUtils {
  public static getSplitedPath = (path: string): string[] => path.split('/').filter(folder => folder !== '');

  public static removePrefixPath = (prefix: string, path: string): string => {
    if (prefix === '/' || path === '/') {
      return path;
    } else {
      const splitedWithoutPrefix = path.split(prefix);
      if (splitedWithoutPrefix.length > 1) {
        return splitedWithoutPrefix[1];
      } else {
        // There's no prefix.
        return path;
      }
    }
  }

  public static getParentPath = (path: string): string => {
    const currentSplitedPath = PathUtils.getSplitedPath(path);
    return `/${currentSplitedPath.slice(0, currentSplitedPath.length - 1).join('/')}`;
  }

  public static moveParentPath = (newParentPath: string, path: string): string => {
    const splitedPath = PathUtils.getSplitedPath(path);
    const splitedPathParent = PathUtils.getSplitedPath(newParentPath);
    if (splitedPath.length > 0) {
      const child = splitedPath[splitedPath.length - 1];
      splitedPathParent.push(child);
      return `/${splitedPathParent.join('/')}`;
    } else {
      return `${newParentPath}`;
    }
  }
}

export class GenericTree<T> {
  // label is a path, like '/things/more things/a lot of things'.

  private children: GenericTree<T>[];

  constructor(private label: string, public node: T|undefined) {
    this.children = [];
  }

  private static placeNodeInTree = <T>(node: T, path: string, tree?: GenericTree<T>): GenericTree<T> => {
    const splitPath = PathUtils.getSplitedPath(path);
    const newTree = tree ? tree : new GenericTree<T>('/', undefined);
    if (splitPath.length === 0) {
      // If splitPath is zero, the node is in root.
      newTree.addChildren('/', node);
    } else {
      // If splitPath is not zero, we have to travel in the tree in height.
      let currentNode: GenericTree<T> = newTree;

      splitPath.forEach(label => {
        currentNode = currentNode.addChildren(label, undefined);
      });

      currentNode.addChildren(path, node);
    }
    return newTree;
  }

  static parseFromListWithPaths = <T>(listToParse: T[]): GenericTree<T> | undefined => {
    if (listToParse.length === 0) {
      return new GenericTree<T>('/', undefined);
    } else if ((listToParse[0] as any).path) {
      let newTree: GenericTree<T> | undefined = undefined;
      listToParse.forEach(newNode => {
        newTree = GenericTree.placeNodeInTree(newNode, (newNode as any).path as string, newTree);
      });
      return newTree;
    }
    return undefined;
  }

  static toString = <T>(tree: GenericTree<T>, toString: (current: T) => string): string => {
    let childrenCollections: GenericTree<T>[] = tree.children;
    let newChildrensCollection: GenericTree<T>[] = [];
    let result: string = '';
    let level = 0;
    while (childrenCollections.length > 0) {
      result = `${result} T[level: ${level}, childs: `;
      childrenCollections.forEach(child => {
        if (child.node) {
          result = `${result} (label: ${child.label}, node: ${toString(child.node)}), `;
        } else {
          result = `${result} (label: ${child.label}), `;
        }
        newChildrensCollection = newChildrensCollection.concat(child.children);
      });
      result = `${result}],\n`;
      childrenCollections = newChildrensCollection;
      newChildrensCollection = [];
      level++;
    }
    return result;
  }

  static parseTreeToList = <T>(tree: GenericTree<T>): T[] => {
    const treeList: T[] = [];
    if (tree.children.length > 0) {
      tree.readTreeInWidth((current => (current.node) ? treeList.push(current.node) : undefined));
    }
    return treeList;
  }

  private readTreeInWidth = (doActionInNode: (current: GenericTree<T>) => void) => {
    let childrenCollections: GenericTree<T>[] = this.children;
    let newChildrensCollection: GenericTree<T>[] = [];
    while (childrenCollections.length > 0) {
      childrenCollections.forEach(child => {
        doActionInNode(child);
        newChildrensCollection = newChildrensCollection.concat(child.children);
      });
      childrenCollections = newChildrensCollection;
      newChildrensCollection = [];
    }
  }

  renameLabel = (newPostfix: string): void => {
    const splitedPath = PathUtils.getSplitedPath(this.label);
    if (splitedPath.length > 0) {
      splitedPath.pop();
      this.label = `/${splitedPath.join('/')}/${newPostfix}}`;
    } else {
      this.label = `/${newPostfix}}`;
    }
  }

  get Label (): string {
    return this.label;
  }

  addChildren = (label: string, node?: T): GenericTree<T> => {
    // RETURN: The new children.
    const newChild: GenericTree<T> = new GenericTree<T>(label, node);
    if (!node) {
      // It's an intemediate node.
      const indexChild = this.children.findIndex(child => child.label === label);
      if (indexChild === -1) {
        this.children.push(newChild);
      }
    } else {
      // It's a leaf
      this.children.push(newChild);
    }
    return newChild;
  }

  removeChild = (childToRemove: GenericTree<T>, equalsT: (node1: T, node2: T) => boolean): void => {
    const indexChildToDelete = (childToRemove.node) ? 
      this.searchNodeLeafInChild(childToRemove.node, equalsT)
      : this.searchLabelInChild(childToRemove.label);

    if (indexChildToDelete >= 0) {
      this.children.splice(indexChildToDelete, 1);
    }
  }

  private searchNodeIntermediate = (label: string): GenericTree<T> | undefined => {
    // We search in weight.
    const splitPath = PathUtils.getSplitedPath(label);
    if (splitPath.length === 0) {
      return undefined;
    } else {
      let currentNode: GenericTree<T> = this;
      let labelToSearch: string;
      let indexChild: number;

      for (let i = 0; i < splitPath.length; i++) {
        labelToSearch = splitPath[i];
        indexChild = currentNode.searchLabelInChild(labelToSearch);
        if (indexChild === -1) {
          return undefined;
        } else {
          currentNode = currentNode.children[indexChild];
        }
      }
      return currentNode;
    }
  }

  private searchNodeLeafInChild = (node: T, equalsT: (node1: T, node2: T) => boolean): number => 
    this.children.findIndex(child => !!child.node && equalsT(child.node!, node));

  private searchLabelInChild = (label: string): number => this.children.findIndex(child => child.label === label);

  private searchParent = (child: GenericTree<T>): GenericTree<T> | undefined => {
    if (!child.node) {
      // Same label, child it's a leaf.
      return this.searchNodeIntermediate(child.label);
    } else {
      // Diferent label, calculate label, child it's a folder.
      const newLabel = PathUtils.getParentPath(child.label);
      if (newLabel === '/') {
        // Parent it's the root.
        return this;
      } else {
        return this.searchNodeIntermediate(newLabel);
      }
    }
  }

  private changeLabel = (prefixToRemove: string, newPrefix: string) => {
    if (this.node) {
      this.label = newPrefix;
    } else {
      const pathWithoutPrefix = PathUtils.removePrefixPath(prefixToRemove, this.label);
      this.label = `${newPrefix}/${pathWithoutPrefix}`;
      this.readTreeInWidth(node => node.changeLabel(prefixToRemove, newPrefix));
      // this.children.forEach(child => child.changeLabel(prefixToRemove, newPrefix));
    }
  }

  private putNode = (nodeToPut: GenericTree<T>, newChild: GenericTree<T>) => {
    const oldPath = PathUtils.getParentPath(newChild.label);
    const newLabel = newChild.node ? PathUtils.moveParentPath(nodeToPut.label, newChild.label) : nodeToPut.label;
    nodeToPut.addChildren(newLabel, newChild.node);
    
    newChild.children.forEach(child => child.changeLabel(oldPath, newLabel));
  }

  moveNode = (labelFrom: string, labelTo: string, node: T | undefined, equalsT: (node1: T, node2: T) => boolean): void => {
    let nodeFrom = this.searchNodeIntermediate(labelFrom);
    if (nodeFrom) {
      let indexNode;
      let currentNode;
      if (node) {
        // Searched node is a leaf.
        indexNode = nodeFrom.searchNodeLeafInChild(node, equalsT);
        currentNode = nodeFrom.children[indexNode];
      } else {
        // Searched node is a folder.
        currentNode = nodeFrom;
        nodeFrom = this.searchParent(currentNode)!;
        indexNode = nodeFrom.searchLabelInChild(labelFrom);
      }
      nodeFrom.removeChild(currentNode, equalsT);
      const nodeTo = this.searchNodeIntermediate(labelTo);
      if (nodeTo) {
        this.putNode(nodeTo, currentNode);
      }
    }
  }
}