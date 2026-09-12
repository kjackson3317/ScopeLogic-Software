export type RuleOutputBehavior = "calculate_only" | "recommend_bom" | "auto_apply";
export interface QuantityInput { key:string; label:string; value:number; unit:string; source:"manual"|"import"|"takeoff"|"api"|"schedule"; }
export interface RuleResult { ruleId:string; ruleVersion:string; label:string; value:number; unit:string; behavior:RuleOutputBehavior; trace:string[]; }
export interface QuantityContribution { sourceType:"rule"|"manual"|"takeoff"|"import"; sourceId?:string; label:string; quantity:number; unit:string; }
