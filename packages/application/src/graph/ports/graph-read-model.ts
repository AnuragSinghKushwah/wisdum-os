import type { TenantId } from '@wisdum/types';

export interface GraphNodeDto {
  readonly id: string;
  readonly label: string;
  readonly type: string;
  readonly weight: number;
  readonly description?: string;
}

export interface GraphEdgeDto {
  readonly source: string;
  readonly target: string;
  readonly label: string;
  readonly occurrenceCount: number;
}

export interface GraphTopologyDto {
  readonly nodes: readonly GraphNodeDto[];
  readonly edges: readonly GraphEdgeDto[];
}

export interface GraphReadModel {
  getTopology(tenantId: TenantId): Promise<GraphTopologyDto>;
  getNeighbors(tenantId: TenantId, conceptId: string, depth?: number): Promise<GraphTopologyDto>;
  getConcepts(tenantId: TenantId): Promise<readonly GraphNodeDto[]>;
  getRelationships(tenantId: TenantId): Promise<readonly GraphEdgeDto[]>;
}
