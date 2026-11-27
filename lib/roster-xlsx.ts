import {strToU8,zipSync} from "fflate";
import type {RosterOptions} from "./roster-options";

type Player={nick:string;playerId:string};
type Entry={teamName:string;contactPhone?:string;logoName?:string;logoUrl?:string;zones?:string[];players:Player[]};
type Column={heading:string;width:number;get:(entry:Entry)=>string};

/** XML valid, plain text only (no formula evaluation from attendee input). */
const xml=(value:unknown)=>String(value??"")
  .replace(/[\u0000-\u001f\u007f]/g," ")
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
  .replaceAll('"',"&quot;").replaceAll("'","&apos;");
const letter=(index:number)=>{let value="";for(let i=index+1;i;i=Math.floor((i-1)/26))value=String.fromCharCode(65+(i-1)%26)+value;return value};
const textCell=(col:number,row:number,value:unknown,style:number)=>`<c r="${letter(col)}${row}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;

/** Admin's form toggles control fields; separate Excel toggles can hide Nick and ID independently. */
export function rosterExcelColumns(maxPlayers:number,entries:Entry[],options:RosterOptions,origin:string): Column[] {
  const cols:Column[]=[{heading:"Nama Team",width:32,get:entry=>entry.teamName}];
  if(options.phoneEnabled)cols.push({heading:"Nomor HP Team",width:22,get:entry=>entry.contactPhone||""});
  if(options.logoEnabled){
    cols.push({heading:"Nama Logo",width:25,get:entry=>entry.logoName||""});
    cols.push({heading:"Link Logo Team",width:35,get:entry=>entry.logoUrl ? new URL(entry.logoUrl,origin).href : ""});
  }
  if(options.zonesEnabled)options.maps.forEach((name,i)=>cols.push({heading:`Drop Zone ${name}`,width:24,get:entry=>entry.zones?.[i]||""}));
  if(options.playersEnabled){
    // Preserve saved player data if admin reduces maxPlayers after registration.
    const slots=Math.min(20,Math.max(1,Number.isFinite(maxPlayers)?Math.floor(maxPlayers):1,entries.reduce((max,e)=>Math.max(max,e.players?.length||0),0)));
    for(let i=0;i<slots;i++){
      if(options.excelNicknameEnabled!==false)cols.push({heading:`Nick Player ${i+1}`,width:22,get:entry=>entry.players?.[i]?.nick||""});
      if(options.excelPlayerIdEnabled!==false)cols.push({heading:`ID Player ${i+1}`,width:22,get:entry=>entry.players?.[i]?.playerId||""});
    }
  }
  return cols;
}

/** Single worksheet: first data column is always the team, next team goes on next row. */
function makeSheet(title:string,maxPlayers:number,entries:Entry[],options:RosterOptions,origin:string){
  const columns=rosterExcelColumns(maxPlayers,entries,options,origin);
  const lastColumn=letter(columns.length-1),lastRow=Math.max(3,entries.length+2);
  const titleCells=textCell(0,1,`${title} | ${entries.length} TEAM`,1);
  const headings=columns.map((col,i)=>textCell(i,2,col.heading,2)).join("");
  const data=entries.map((entry,i)=>{
    const cells=columns.map((col,j)=>textCell(j,i+3,col.get(entry),j===0?3:(i%2===0?4:5))).join("");
    return `<row r="${i+3}" ht="21" customHeight="1">${cells}</row>`;
  }).join("");
  const empty=entries.length?"":`<row r="3">${textCell(0,3,"Belum ada data team",4)}</row>`;
  const widths=columns.map((column,i)=>`<col min="${i+1}" max="${i+1}" width="${column.width}" customWidth="1"/>`).join("");
  // SpreadsheetML elements have a fixed sequence. Excel repairs worksheets when
  // sheetPr follows dimension or autoFilter follows mergeCells.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${lastColumn}${lastRow}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0">${columns.length>1?`<pane xSplit="1" ySplit="2" topLeftCell="B3" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="B3" sqref="B3"/>`:`<pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A3" sqref="A3"/>`}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="21"/><cols>${widths}</cols><sheetData><row r="1" ht="29" customHeight="1">${titleCells}</row><row r="2" ht="28" customHeight="1">${headings}</row>${data}${empty}</sheetData><autoFilter ref="A2:${lastColumn}${lastRow}"/>${columns.length>1?`<mergeCells count="1"><mergeCell ref="A1:${lastColumn}1"/></mergeCells>`:""}<printOptions horizontalCentered="1"/><pageMargins left="0.2" right="0.2" top="0.3" bottom="0.3" header="0.1" footer="0.1"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="1"/></worksheet>`;
}

export function createRosterWorkbook(title:string,maxPlayers:number,entries:Entry[],options:RosterOptions,origin:string){
  const sheet=makeSheet(title,maxPlayers,entries,options,origin);
  const lastCol=letter(rosterExcelColumns(maxPlayers,entries,options,origin).length-1);
  const lastRow=Math.max(3,entries.length+2);
  const printArea=`'Data Player'!$A$1:$${lastCol}$${lastRow}`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="10"/><name val="Aptos"/></font><font><b/><sz val="13"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font><font><b/><sz val="10"/><color rgb="FF1E1E1E"/><name val="Aptos"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1D1D1D"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE9D294"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF6F3EC"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF888888"/></left><right style="thin"><color rgb="FF888888"/></right><top style="thin"><color rgb="FF888888"/></top><bottom style="thin"><color rgb="FF888888"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" indent="1"/></xf><xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" indent="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" indent="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const files:Record<string,Uint8Array>={
    "[Content_Types].xml":strToU8(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),
    "_rels/.rels":strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml":strToU8(`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Data Player" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">${xml(printArea)}</definedName></definedNames></workbook>`),
    "xl/_rels/workbook.xml.rels":strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/styles.xml":strToU8(styles),
    "xl/worksheets/sheet1.xml":strToU8(sheet),
  };
  return new Blob([Uint8Array.from(zipSync(files))],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
