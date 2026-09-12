export type Id = string;
export type ModuleKey = "core"|"quote"|"rules"|"scope_review"|"bid_analysis"|"takeoff"|"integration_salesforce"|"integration_vendor_pricing"|"intelligence";
export type AccessScope = "assigned" | "all";
export interface Organization { id: Id; name: string; slug: string; }
export interface Project { id: Id; organizationId: Id; projectNumber: string; name: string; assignedUserIds: Id[]; }
export interface Quote { id: Id; organizationId: Id; projectId: Id; quoteNumber: string; name: string; currentVersion: string; }
