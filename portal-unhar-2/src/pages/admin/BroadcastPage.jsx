import { useState } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import api, { getErrorMessage } from '../../services/api'
import './AdminCrud.css'
const ROLES=[{v:'semua',l:'Semua Pengguna'},{v:'mahasiswa',l:'Hanya Mahasiswa'},{v:'dosen',l:'Hanya Dosen'}]
const TIPE=[
  {v:'Akademik',l:'Akademik'},
  {v:'Jadwal',l:'Jadwal'},
  {v:'Nilai',l:'Nilai'},
  {v:'Pembayaran',l:'Pembayaran'},
  {v:'Umum',l:'Umum / Pengumuman'},
]
export default function BroadcastPage(){
  const [form,setForm]=useState({role:'semua',judul:'',isi:'',tipe:'Akademik'})
  const [saving,setSaving]=useState(false),[msg,setMsg]=useState(null),[err,setErr]=useState('')
  async function handleSend(){
    if(!form.judul.trim()||!form.isi.trim()){setErr('Judul dan isi notifikasi wajib diisi.');return}
    if(!confirm(`Kirim notifikasi ke ${ROLES.find(r=>r.v===form.role)?.l}?`))return
    setSaving(true);setErr('');setMsg(null)
    try{const res=await api.post('/admin/notifikasi/broadcast',form);setMsg(res.data?.message||'Notifikasi berhasil dikirim.');setForm({role:'semua',judul:'',isi:'',tipe:'Akademik'})}
    catch(e){setErr(getErrorMessage(e))}finally{setSaving(false)}
  }
  const sel={padding:'10px 12px',border:'1.5px solid var(--border)',borderRadius:9,fontSize:13,background:'#fff',outline:'none',width:'100%'}
  return(<div className="page-single">
    <PageHeader title="Broadcast Notifikasi" subtitle="Kirim notifikasi ke pengguna portal"/>
    <div className="content-body"><div className="card" style={{padding:'28px 32px',maxWidth:720}}>
      {msg&&<div style={{background:'#dcfce7',color:'#16a34a',padding:'10px 14px',borderRadius:8,marginBottom:16,fontSize:13,fontWeight:600}}>{msg}</div>}
      {err&&<div className="adm-error">{err}</div>}
      <div className="adm-field"><label>Target Penerima</label><select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} style={sel}>{ROLES.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}</select></div>
      <div className="adm-field"><label>Tipe Notifikasi</label><select value={form.tipe} onChange={e=>setForm(p=>({...p,tipe:e.target.value}))} style={sel}>{TIPE.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
      <div className="adm-field"><label>Judul</label><input type="text" value={form.judul} onChange={e=>setForm(p=>({...p,judul:e.target.value}))} placeholder="Contoh: Libur Hari Raya" maxLength={150}/></div>
      <div className="adm-field"><label>Isi Notifikasi</label><textarea value={form.isi} onChange={e=>setForm(p=>({...p,isi:e.target.value}))} rows={6} placeholder="Tulis pesan di sini..." style={{...sel,fontFamily:'inherit',resize:'vertical'}}/></div>
      <div style={{display:'flex',justifyContent:'flex-end',marginTop:20}}><button className="adm-btn-save" onClick={handleSend} disabled={saving} style={{minWidth:140}}>{saving?'Mengirim...':'Kirim Broadcast'}</button></div>
    </div></div>
  </div>)
}
