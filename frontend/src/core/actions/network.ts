import { fetchJsonReceive, fetchJsonSendAndReceive } from '../fetch-utils';
import { networkUpnpDiscoverEndpoint, networkUpnpBrowseEndpoint } from '../urls-and-end-points';

export interface UPnPServer {
  name: string;
  controlUrl: string;
  location: string;
}

export interface UPnPContainer {
  id: string;
  title: string;
  childCount: number;
}

export interface UPnPItem {
  id: string;
  title: string;
  resourceUrl: string;
  mimeType: string;
}

export interface UPnPBrowseResult {
  containers: UPnPContainer[];
  items: UPnPItem[];
}

const discoverServers = (): Promise<{ servers: UPnPServer[] }> =>
  fetchJsonReceive<{ servers: UPnPServer[] }>(networkUpnpDiscoverEndpoint(), { servers: [] });

const browseServer = (controlUrl: string, objectId = '0'): Promise<UPnPBrowseResult> =>
  fetchJsonSendAndReceive<UPnPBrowseResult>(
    networkUpnpBrowseEndpoint(),
    { controlUrl, objectId },
    { containers: [], items: [] }
  );

export const NetworkActions = { discoverServers, browseServer };
