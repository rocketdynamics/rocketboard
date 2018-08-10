import React, { Component } from 'react'
import PropTypes from 'prop-types'
import RetroColumn from './RetroColumn';

import './App.css'
import "antd/dist/antd.css";

class App extends Component {
  render() {
    return (
  <div className="App">
    <h1>Retrospective</h1>

    <RetroColumn title="Actions" colour="Red" layout="vertical" cardWidth="200px"/>
    <div style={{display: "flex"}}>
      <RetroColumn title="Positive" colour="lime"/>
      <RetroColumn title="Mixed" colour="orange"/>
      <RetroColumn title="Negative" colour="maroon"/>
    </div>
  </div>
)
  }
}

App.propTypes = {
}

export default App
