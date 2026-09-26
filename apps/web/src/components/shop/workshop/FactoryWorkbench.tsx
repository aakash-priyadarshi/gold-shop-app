"use client";

import { WorkshopProductionFloor } from "./production/WorkshopProductionFloor";

export interface FactoryWorkbenchProps {
  staffMode?: boolean;
  canApprove?: boolean;
}

/**
 * Modular wrapper delegating production and operator execution to WorkshopProductionFloor.
 * Preserves backwards compatibility with legacy routes and staff stations.
 */
export function FactoryWorkbench({
  staffMode = false,
  canApprove = true,
}: FactoryWorkbenchProps = {}) {
  return (
    <WorkshopProductionFloor
      staffMode={staffMode}
      canApprove={canApprove}
    />
  );
}
