import type { EdgeHelpText } from './types';
import { adStructureEdges } from './ad-structure';
import { adLateralMovementEdges } from './ad-lateral-movement';
import { adCredentialAccessEdges } from './ad-credential-access';
import { adObjectManipulationEdges } from './ad-object-manipulation';
import { adTrustEdges } from './ad-trust';
import { adAdcsEdges } from './ad-adcs';
import { adNtlmRelayEdges } from './ad-ntlm-relay';
import { azureStructureEdges } from './azure-structure';
import { azureManipulationEdges } from './azure-manipulation';
import { azureMsgraphEdges } from './azure-msgraph';

const edgeRegistry = new Map<string, EdgeHelpText>();

[
  ...adStructureEdges,
  ...adLateralMovementEdges,
  ...adCredentialAccessEdges,
  ...adObjectManipulationEdges,
  ...adTrustEdges,
  ...adAdcsEdges,
  ...adNtlmRelayEdges,
  ...azureStructureEdges,
  ...azureManipulationEdges,
  ...azureMsgraphEdges,
].forEach((edge) => edgeRegistry.set(edge.kind, edge));

export function getEdgeHelpText(kind: string): EdgeHelpText | undefined {
  return edgeRegistry.get(kind);
}

export function getAllEdgeKinds(): string[] {
  return Array.from(edgeRegistry.keys());
}

export type { EdgeHelpText };
