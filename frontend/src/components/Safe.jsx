import { Component } from "react";
export default class Safe extends Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  render() { return this.state.err ? <p className="fixed bottom-5 right-5 z-50 bg-black text-white p-3 text-sm max-w-xs">Tavix AI chat hit an error. Reload the page.</p> : this.props.children; }
}
