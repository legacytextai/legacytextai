import { useEffect, useState } from 'react';
import { getAutoOtp, setAutoOtp, getDebugAuth, setDebugAuth } from '@/utils/debugConfig';

export default function DebugControls() {
  const [show, setShow] = useState(false);
  const [debug, setDebug] = useState(false);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    const d = getDebugAuth();
    setDebug(d);
    setAuto(getAutoOtp());
    setShow(d); // only show panel when debug is on
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position:'fixed', bottom:16, right:16, zIndex:9999,
      background:'#111', color:'#fff', padding:'12px 14px', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,.4)'
    }}>
      <div style={{fontWeight:600, marginBottom:8}}>Debug Controls</div>
      <label style={{display:'flex', alignItems:'center', gap:8}}>
        <input type="checkbox" checked={debug}
          onChange={e => { setDebug(e.target.checked); setDebugAuth(e.target.checked); location.reload(); }} />
        Debug overlay
      </label>
      <label style={{display:'flex', alignItems:'center', gap:8, marginTop:8}}>
        <input type="checkbox" checked={auto}
          onChange={e => { setAuto(e.target.checked); setAutoOtp(e.target.checked); }} />
        Auto-OTP kickoff
      </label>
      <div style={{fontSize:12, opacity:.8, marginTop:8}}>
        Tip: add <code>?debug=1</code> or <code>?autootp=0</code> to any URL.
      </div>
    </div>
  );
}