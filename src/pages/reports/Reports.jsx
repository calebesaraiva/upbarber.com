import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { reportsService } from '../../services/reports.service';

export default function Reports(){const[data,setData]=useState(null);useEffect(()=>{reportsService.getRevenue({}).then(r=>setData(r.data.data));},[]);const exportCsv=async()=>{const r=await reportsService.exportCsv('financial/revenue',{});const url=URL.createObjectURL(r.data);const a=document.createElement('a');a.href=url;a.download='relatorio-upbarber.csv';a.click();URL.revokeObjectURL(url)};return <div><PageHeader title="Relatórios" subtitle="Dados calculados pela API" actions={<button className="btn-secondary" onClick={exportCsv}><Download size={14}/> CSV</button>}/><div className="card"><pre className="text-xs text-gray-400 whitespace-pre-wrap">{JSON.stringify(data||{},null,2)}</pre></div></div>}
