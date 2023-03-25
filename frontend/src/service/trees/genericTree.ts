import { PathUtils } from "./pathUtils";

export class GenericTree<T> {
  // label is a path, like '/things/more things/a lot of things'.

  children: GenericTree<T>[];

  constructor(public label: string, public node: T|undefined) {
    this.children = [];
  }

  readTreeInWidth = (doActionInNode: (current: GenericTree<T>) => void) => {
    let childrenCollections: GenericTree<T>[] = this.children;
    let newChildrensCollection: GenericTree<T>[] = [];
    doActionInNode(this);
    while (childrenCollections.length > 0) {
      childrenCollections.forEach(child => {
        doActionInNode(child);
        newChildrensCollection = newChildrensCollection.concat(child.children);
      });
      childrenCollections = newChildrensCollection;
      newChildrensCollection = [];
    }
  }

  renameLabelNode = (newPostfix: string): void => {
    if (this.node) return; // leaf nodes cannot change its label

    const splitedPath = PathUtils.getSplitedPath(this.label);

    if (splitedPath.length > 0) {
      const oldName = this.label;
      splitedPath.pop();
      const prefix = splitedPath.length > 0 ? `/${splitedPath.join('/')}` : '';
      this.label = `${prefix}/${newPostfix}`;
      this.children.forEach(child => child.readTreeInWidth(current => {
        current.label = current.label.replace(oldName, this.label);
      }));
    } else {
      this.label = '/';
    }
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

  searchNodeLeafInChild = (node: T, equalsT: (node1: T, node2: T) => boolean): number => 
    this.children.findIndex(child => !!child.node && equalsT(child.node!, node));

  searchLabelInChild = (label: string): number => this.children.findIndex(child => child.label === label);

  moveNode = (labelFrom: string, labelTo: string, node: T | undefined, equalsT: (node1: T, node2: T) => boolean): void => {
    let nodeFrom = GenericTree.searchNodeIntermediate(this, labelFrom);
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
        nodeFrom = GenericTree.searchParent(this, currentNode)!;
        indexNode = nodeFrom.searchLabelInChild(labelFrom);
      }
      nodeFrom.removeChild(currentNode, equalsT);
      const nodeTo = GenericTree.searchNodeIntermediate(this, labelTo);
      if (nodeTo) {
        GenericTree.putNode(nodeTo, currentNode);
      }
    }
  }

  // --------------------------- Static

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

  static parseTreeToList = <T>(tree: GenericTree<T>): T[] => {
    const treeList: T[] = [];
    if (tree.children.length > 0) {
      tree.readTreeInWidth((current => (current.node) ? treeList.push(current.node) : undefined));
    }
    return treeList;
  }

  static toString = <T>(tree: GenericTree<T>, toString: (current: T) => string): string => {
    let childrenCollections: GenericTree<T>[] = tree.children;
    let newChildrensCollection: GenericTree<T>[] = [];
    let result: string = '';
    let level = 1;
    if (tree.node) {
      result = `T[level 0, (label: ${tree.label}, node: ${toString(tree.node)}), )],\n]`
    } else {
      result = `T[level 0, (label: ${tree.label}), ],\n]`
    }
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
  static placeNodeInTree = <T>(node: T, path: string, tree?: GenericTree<T>): GenericTree<T> => {
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

  static searchNodeIntermediate = <T>(completedTree: GenericTree<T>, label: string): GenericTree<T> | undefined => {
    // We search in weight.
    const splitPath = PathUtils.getSplitedPath(label);
    if (splitPath.length === 0) {
      return undefined;
    } else {
      let currentNode: GenericTree<T> = completedTree;
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

  
  static searchParent = <T>(completedTree: GenericTree<T>, child: GenericTree<T>): GenericTree<T> | undefined => {
    if (!child.node) {
      // Same label, child it's a leaf.
      return GenericTree.searchNodeIntermediate(completedTree, child.label);
    } else {
      // Diferent label, calculate label, child it's a folder.
      const newLabel = PathUtils.getParentPath(child.label);
      if (newLabel === '/') {
        // Parent it's the root.
        return completedTree;
      } else {
        return GenericTree.searchNodeIntermediate(completedTree, newLabel);
      }
    }
  }

  static changeLabel = <T>(nodeToChange: GenericTree<T>, prefixToRemove: string, newPrefix: string) => {
    const changeLabelToNode = (_nodeToChange: GenericTree<T>, _prefixToRemove: string, _newPrefix: string) => {
      if (_nodeToChange.node) {
        _nodeToChange.label = _newPrefix;
      } else {
        const pathWithoutPrefix = PathUtils.removePrefixPath(_prefixToRemove, _nodeToChange.label);
        _nodeToChange.label = `${_newPrefix}/${pathWithoutPrefix}`;
      }
    };

    changeLabelToNode(nodeToChange, prefixToRemove, newPrefix);

    if (nodeToChange.node) {
      nodeToChange.readTreeInWidth(node => changeLabelToNode(node, prefixToRemove, newPrefix));
    }
    // nodeToChange.children.forEach(child => child.changeLabel(prefixToRemove, newPrefix));
  }

  static putNode = <T>(nodeToPut: GenericTree<T>, newChild: GenericTree<T>) => {
    const oldPath = PathUtils.getParentPath(newChild.label);
    const newLabel = newChild.node ? PathUtils.moveParentPath(nodeToPut.label, newChild.label) : nodeToPut.label;
    nodeToPut.addChildren(newLabel, newChild.node);
    
    newChild.children.forEach(child => GenericTree.changeLabel(child, oldPath, newLabel));
  }
}
