import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { err: null } }
  static getDerivedStateFromError(err){ return { err } }
  componentDidCatch(err, info){ console.error('ErrorBoundary:', err, info) }
  render(){
    if(this.state.err){
      return (
        <div className="modal-bg">
          <div className="modal" style={{maxWidth:420,padding:26}}>
            <h3 style={{marginBottom:10}}>Nimadir xato ketdi</h3>
            <p style={{color:'var(--mut)',fontSize:13.5,marginBottom:18}}>{String(this.state.err && this.state.err.message || this.state.err)}</p>
            <button className="btn" style={{width:'100%'}} onClick={()=>this.setState({err:null})}>Yopish</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
