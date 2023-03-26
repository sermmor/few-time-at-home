export class PathUtils {
  public static getSplitedPath = (path: string): string[] => path.split('/').filter(folder => folder !== '');

  public static removePrefixPath = (prefix: string, path: string): string => {
    if (prefix === '/' || path === '/') {
      return path;
    } else {
      const splitedWithoutPrefix = path.split(prefix);
      if (splitedWithoutPrefix.length > 1) {
        return splitedWithoutPrefix[1] === '' ? '/' : splitedWithoutPrefix[1];
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
