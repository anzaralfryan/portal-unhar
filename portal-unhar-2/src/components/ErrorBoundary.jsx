import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Error caught by boundary:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Mode silent — untuk komponen non-kritis (mis. ChatBubble) yang tidak
      // boleh menghancurkan seluruh layout jika error. Cukup sembunyikan diri.
      if (this.props.silent) {
        return null
      }

      return (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'80vh',padding:24}}>
          <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:14,padding:'32px 36px',maxWidth:480,textAlign:'center'}}>
            <div style={{width:48,height:48,margin:'0 auto 12px',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h2 style={{fontFamily:'var(--font-heading)',fontSize:18,fontWeight:700,color:'var(--text)',marginBottom:8}}>
              Terjadi Kesalahan
            </h2>
            <p style={{fontSize:13,color:'var(--text2)',marginBottom:6,lineHeight:1.6}}>
              Halaman ini gagal dimuat karena ada error. Silakan coba kembali ke beranda.
            </p>
            <p style={{fontSize:11,color:'var(--text3)',marginBottom:20,fontFamily:'monospace',background:'var(--bg)',padding:8,borderRadius:6,wordBreak:'break-word'}}>
              {this.state.error?.message || 'Unknown error'}
            </p>
            <button onClick={this.handleReload} style={{background:'var(--primary)',color:'#fff',border:'none',padding:'10px 24px',borderRadius:9,fontFamily:'var(--font-heading)',fontSize:13,fontWeight:700,cursor:'pointer'}}>
              Kembali ke Beranda
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
