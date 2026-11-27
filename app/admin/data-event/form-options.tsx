import type {RosterOptions} from "../../../lib/roster-options";

export function FormOptions({value, change}: {value:RosterOptions; change:(options:RosterOptions)=>void}) {
  const switches = [
    ["playersEnabled","Nick + ID player"], ["phoneEnabled","Nomor HP team"], ["logoEnabled","Upload logo team"], ["zonesEnabled","Drop Zone"]
  ] as const;
  return <fieldset><legend>Isian peserta</legend>
    {switches.map(([key,label])=><label key={key}><span><input type="checkbox" style={{width:"auto"}} checked={value[key]} onChange={e=>change({...value,[key]:e.target.checked})}/> {label}</span></label>)}
    {value.logoEnabled&&<label>Ketentuan logo
      <select value={value.logoRequired?"required":"optional"} onChange={e=>change({...value,logoRequired:e.target.value==="required"})}>
        <option value="required">Wajib upload</option><option value="optional">Opsional</option>
      </select>
    </label>}
    {value.zonesEnabled && value.maps.map((name,i)=><label key={i}>Nama map {i+1}<input maxLength={40} value={name} onChange={e=>change({...value,maps:value.maps.map((v,j)=>i===j?e.target.value:v)})}/></label>)}
    {value.playersEnabled && <fieldset><legend>Kolom Excel</legend>
      <label><span><input type="checkbox" style={{width:"auto"}} checked={value.excelNicknameEnabled!==false} onChange={e=>change({...value,excelNicknameEnabled:e.target.checked})}/> Tampilkan Nick</span></label>
      <label><span><input type="checkbox" style={{width:"auto"}} checked={value.excelPlayerIdEnabled!==false} onChange={e=>change({...value,excelPlayerIdEnabled:e.target.checked})}/> Tampilkan ID</span></label>
    </fieldset>}
    <label><span><input type="checkbox" style={{width:"auto"}} checked={value.publicRegistrationEnabled===true} onChange={e=>change({...value,publicRegistrationEnabled:e.target.checked})}/> Aktifkan link pendaftaran umum</span></label>
    <label>Link grup WhatsApp event<input type="url" value={value.groupUrl} placeholder="https://chat.whatsapp.com/…" onChange={e=>change({...value,groupUrl:e.target.value})}/></label>
  </fieldset>;
}
