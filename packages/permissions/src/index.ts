import type { AccessScope, ModuleKey } from "@scopelogic/domain";
export type RoleKey = "administrator"|"executive"|"manager"|"estimator"|"project_manager"|"sales"|"viewer";
export interface RoleDefinition { key: RoleKey; label: string; defaultAccessScope: AccessScope; moduleAccess: Partial<Record<ModuleKey, boolean>>; }
export const defaultRoles: RoleDefinition[] = [
  {key:"administrator",label:"Administrator",defaultAccessScope:"all",moduleAccess:{core:true,quote:true,rules:true,scope_review:true,bid_analysis:true,takeoff:true,integration_salesforce:true,integration_vendor_pricing:true,intelligence:true}},
  {key:"executive",label:"Executive",defaultAccessScope:"all",moduleAccess:{core:true,quote:true,rules:true}},
  {key:"manager",label:"Manager",defaultAccessScope:"all",moduleAccess:{core:true,quote:true,rules:true}},
  {key:"estimator",label:"Estimator",defaultAccessScope:"assigned",moduleAccess:{core:true,quote:true,rules:true}},
  {key:"project_manager",label:"Project Manager",defaultAccessScope:"assigned",moduleAccess:{core:true}},
  {key:"sales",label:"Sales",defaultAccessScope:"assigned",moduleAccess:{core:true}},
  {key:"viewer",label:"Viewer",defaultAccessScope:"assigned",moduleAccess:{core:true}}
];
