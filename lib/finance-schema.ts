import { env } from "cloudflare:workers";

export async function ensureExpenseFundingSource(){
  const columns=await env.DB.prepare("PRAGMA table_info(finance_expenses)").all<{name:string}>();
  if(columns.results.some(x=>x.name==="funding_source"))return;
  try{await env.DB.prepare("ALTER TABLE finance_expenses ADD COLUMN funding_source TEXT NOT NULL DEFAULT 'MEMBER'").run()}
  catch(error){if(!String(error).includes("duplicate column name"))throw error}
}

export async function ensurePeriodCancellation(){
  const columns=await env.DB.prepare("PRAGMA table_info(finance_periods)").all<{name:string}>();
  if(!columns.results.some(x=>x.name==="status")){
    try{await env.DB.prepare("ALTER TABLE finance_periods ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE'").run()}
    catch(error){if(!String(error).includes("duplicate column name"))throw error}
  }
  const deductionColumns=await env.DB.prepare("PRAGMA table_info(finance_member_deductions)").all<{name:string}>();
  if(!deductionColumns.results.some(x=>x.name==="cancel_reason")){
    try{await env.DB.prepare("ALTER TABLE finance_member_deductions ADD COLUMN cancel_reason TEXT NOT NULL DEFAULT ''").run()}
    catch(error){if(!String(error).includes("duplicate column name"))throw error}
  }
}
