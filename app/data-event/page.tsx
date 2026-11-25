import RosterForm from "./roster-form";
import {GET} from "../api/roster-events/route";
export const dynamic="force-dynamic";
export const metadata={referrer:"no-referrer"};
export default async function Page({searchParams}:{searchParams:Promise<{event?:string;token?:string;invite?:string}>}){
  const params=await searchParams,event=params.event,token=params.token||"",invite=params.invite||"";
  if(!event||!/^\d+$/.test(event))return <RosterForm/>;
  try{const query=new URLSearchParams({id:event});if(token)query.set("token",token);else if(invite)query.set("invite",invite);
    const response=await GET(new Request("https://panboycommunity.my.id/api/roster-events?"+query));const data=await response.json();
    if(response.ok)return <RosterForm initial={{data,token,invite}}/>;
    return <RosterForm initialError={data.error||"Tautan gagal dimuat."}/>;
  }catch{return <RosterForm/>}
}
